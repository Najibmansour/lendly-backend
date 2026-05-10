import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, ListingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { UnitPreference } from '../pricing/pricing.types';
import { toDecimal } from '../common/decimal.util';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  CompleteBookingDto,
  CompletionParty,
} from './dto/complete-booking.dto';
import { CreateBookingIssueDto } from './dto/create-booking-issue.dto';

const PAYMENT_STATUS_VALUES = ['UNPAID', 'HOLD', 'PAID', 'FAILED'] as const;
type PaymentStatusValue = (typeof PAYMENT_STATUS_VALUES)[number];

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async create(renterId: string, dto: CreateBookingDto) {
    const startAt = this.parseDateOrThrow(dto.startAt, 'startAt');
    const endAt = this.parseDateOrThrow(dto.endAt, 'endAt');
    if (startAt >= endAt) {
      throw new BadRequestException('startAt must be before endAt');
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not available for booking');
    }

    await this.checkAvailability(listing.id, startAt, endAt, null);

    const unitPref: UnitPreference | undefined =
      dto.unitPreference === 'AUTO' ? undefined : dto.unitPreference;
    const quote = this.pricing.computeQuote(
      listing.id,
      startAt,
      endAt,
      {
        hourlyRate: listing.hourlyRate,
        dailyRate: listing.dailyRate,
        weeklyRate: listing.weeklyRate,
      },
      unitPref,
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const booking = await this.prisma.booking.create({
      data: {
        listingId: listing.id,
        renterId,
        ownerId: listing.ownerId,
        startAt,
        endAt,
        expiresAt,
        status: BookingStatus.PENDING,
        paymentStatus: 'UNPAID' as PaymentStatusValue,
        pricingUnit: quote.chosenUnit,
        quantity: quote.quantity,
        unitRate: toDecimal(quote.unitRate),
        subtotal: toDecimal(quote.subtotal),
      },
      include: {
        listing: { select: { id: true, title: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        renter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return this.withCompletion(booking);
  }

  async findAll(userId: string, role: 'renter' | 'owner') {
    const where =
      role === 'renter' ? { renterId: userId } : { ownerId: userId };
    const bookings = await this.prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, title: true, city: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        renter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return bookings.map((booking) => this.withCompletion(booking));
  }

  async findOne(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        listing: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, phone: true },
          // select: { id: true, firstName: true, lastName: true },
        },
        renter: {
          select: { id: true, firstName: true, lastName: true, phone: true },
         
          // select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.ownerId !== userId && booking.renterId !== userId) {
      throw new ForbiddenException(
        'Only the renter or owner can view this booking',
      );
    }
    return this.withCompletion(booking);
  }

  async accept(id: string, ownerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { listing: true },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.ownerId !== ownerId) {
        throw new ForbiddenException('Only the listing owner can accept');
      }
      this.assertPendingBookingNotExpired(booking);
      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException('Only PENDING bookings can be accepted');
      }
      const paymentStatus = (booking as any).paymentStatus as
        | PaymentStatusValue
        | undefined;
      if (paymentStatus === 'UNPAID' || paymentStatus === 'FAILED') {
        throw new BadRequestException(
          'Booking payment must be on hold or paid before acceptance',
        );
      }

      await this.checkAvailabilityTx(
        tx,
        booking.listingId,
        booking.startAt,
        booking.endAt,
        id,
      );

      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CONFIRMED },
        include: {
          listing: { select: { id: true, title: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          renter: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return this.withCompletion(updated);
    });
  }

  async decline(id: string, ownerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.ownerId !== ownerId) {
      throw new ForbiddenException('Only the listing owner can decline');
    }
    this.assertPendingBookingNotExpired(booking);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be declined');
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.DECLINED },
      include: {
        listing: { select: { id: true, title: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        renter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return this.withCompletion(updated);
  }

  async cancel(id: string, renterId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.renterId !== renterId) {
      throw new ForbiddenException('Only the renter can cancel');
    }
    if (booking.status === BookingStatus.PENDING) {
      this.assertPendingBookingNotExpired(booking);
    }
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only PENDING or CONFIRMED bookings can be cancelled',
      );
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: {
        listing: { select: { id: true, title: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        renter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return this.withCompletion(updated);
  }

  async updatePayment(
    id: string,
    renterId: string,
    dto: {
      paymentStatus?: PaymentStatusValue;
      depositAmount?: number;
      paymentReference?: string;
    },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.renterId !== renterId) {
      throw new ForbiddenException(
        'Only the renter can update payment information',
      );
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Only PENDING bookings can update payment information',
      );
    }
    this.assertPendingBookingNotExpired(booking);

    const data: any = {};
    if (dto.paymentStatus) {
      data.paymentStatus = dto.paymentStatus;
    }
    if (dto.depositAmount !== undefined) {
      data.depositAmount = toDecimal(dto.depositAmount);
    }
    if (dto.paymentReference !== undefined) {
      data.paymentReference = dto.paymentReference;
    }
    if (!Object.keys(data).length) {
      throw new BadRequestException('No payment update fields provided');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data,
      include: {
        listing: { select: { id: true, title: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        renter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return this.withCompletion(updated);
  }

  async completeBooking(id: string, userId: string, dto: CompleteBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: {
          listing: { select: { id: true, title: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          renter: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      this.assertBookingParticipant(booking, userId);
      this.assertCompletionPartyMatchesUser(booking, userId, dto.party);

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException('Booking is not completable');
      }
      if (!this.isRentalEnded(booking)) {
        throw new BadRequestException('Booking period has not ended yet');
      }

      if (dto.party === CompletionParty.RENTER && booking.renterConfirmedAt) {
        return this.withCompletion(booking);
      }
      if (dto.party === CompletionParty.OWNER && booking.ownerConfirmedAt) {
        return this.withCompletion(booking);
      }

      const data: {
        renterConfirmedAt?: Date;
        ownerConfirmedAt?: Date;
        status?: BookingStatus;
      } = {};
      const now = new Date();

      if (dto.party === CompletionParty.RENTER) {
        data.renterConfirmedAt = now;
        if (booking.ownerConfirmedAt) {
          data.status = BookingStatus.COMPLETED;
        }
      } else {
        data.ownerConfirmedAt = now;
        if (booking.renterConfirmedAt) {
          data.status = BookingStatus.COMPLETED;
        }
      }

      const updated = await tx.booking.update({
        where: { id },
        data,
        include: {
          listing: { select: { id: true, title: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          renter: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return this.withCompletion(updated);
    });
  }

  async createBookingIssue(
    id: string,
    userId: string,
    dto: CreateBookingIssueDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    this.assertBookingParticipant(booking, userId);

    return this.prisma.bookingIssue.create({
      data: {
        bookingId: id,
        authorId: userId,
        message: dto.message,
        category: dto.category ?? null,
      },
    });
  }

  async getBookingIssues(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    this.assertBookingParticipant(booking, userId);

    return this.prisma.bookingIssue.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private assertPendingBookingNotExpired(booking: {
    status: BookingStatus;
    expiresAt?: Date | null;
  }) {
    if (
      booking.status === BookingStatus.PENDING &&
      booking.expiresAt &&
      booking.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Booking has expired and is no longer actionable',
      );
    }
  }

  private assertBookingParticipant(
    booking: { renterId: string; ownerId: string },
    userId: string,
  ) {
    if (booking.ownerId !== userId && booking.renterId !== userId) {
      throw new ForbiddenException(
        'Only the renter or owner can perform this action',
      );
    }
  }

  private assertCompletionPartyMatchesUser(
    booking: { renterId: string; ownerId: string },
    userId: string,
    party: CompletionParty,
  ) {
    if (party === CompletionParty.RENTER && booking.renterId !== userId) {
      throw new ForbiddenException(
        'Party mismatch: only renter can complete as renter',
      );
    }
    if (party === CompletionParty.OWNER && booking.ownerId !== userId) {
      throw new ForbiddenException(
        'Party mismatch: only owner can complete as owner',
      );
    }
  }

  private isRentalEnded(booking: { endAt: Date }): boolean {
    return Date.now() >= booking.endAt.getTime();
  }

  private withCompletion<
    T extends {
      renterConfirmedAt?: Date | null;
      ownerConfirmedAt?: Date | null;
    },
  >(
    booking: T,
  ): T & {
    completion: {
      renterConfirmedAt: Date | null;
      ownerConfirmedAt: Date | null;
    };
  } {
    return {
      ...booking,
      completion: {
        renterConfirmedAt: booking.renterConfirmedAt ?? null,
        ownerConfirmedAt: booking.ownerConfirmedAt ?? null,
      },
    };
  }

  private parseDateOrThrow(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `${fieldName} is not a valid ISO date string`,
      );
    }
    return date;
  }

  private async checkAvailability(
    listingId: string,
    startAt: Date,
    endAt: Date,
    excludeBookingId: string | null,
  ): Promise<void> {
    const [blocks, confirmed] = await Promise.all([
      this.prisma.availabilityBlock.findMany({
        where: { listingId },
      }),
      this.prisma.booking.findMany({
        where: {
          listingId,
          status: BookingStatus.CONFIRMED,
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
      }),
    ]);
    for (const b of blocks) {
      if (overlaps(startAt, endAt, b.startAt, b.endAt)) {
        throw new BadRequestException(
          'Requested dates overlap with an availability block',
        );
      }
    }
    for (const b of confirmed) {
      if (overlaps(startAt, endAt, b.startAt, b.endAt)) {
        throw new BadRequestException(
          'Requested dates overlap with a confirmed booking',
        );
      }
    }
  }

  private async checkAvailabilityTx(
    tx: Pick<PrismaService, 'availabilityBlock' | 'booking'>,
    listingId: string,
    startAt: Date,
    endAt: Date,
    excludeBookingId: string,
  ): Promise<void> {
    const [blocks, confirmed] = await Promise.all([
      tx.availabilityBlock.findMany({ where: { listingId } }),
      tx.booking.findMany({
        where: {
          listingId,
          status: BookingStatus.CONFIRMED,
          id: { not: excludeBookingId },
        },
      }),
    ]);
    for (const b of blocks) {
      if (overlaps(startAt, endAt, b.startAt, b.endAt)) {
        throw new BadRequestException(
          'Dates overlap with an availability block; booking no longer available',
        );
      }
    }
    for (const b of confirmed) {
      if (overlaps(startAt, endAt, b.startAt, b.endAt)) {
        throw new BadRequestException(
          'Dates overlap with a confirmed booking; no longer available',
        );
      }
    }
  }
}
