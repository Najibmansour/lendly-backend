import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Two ranges overlap iff (startA < endB) AND (endA > startB) */
function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getBlocks(listingId: string) {
    await this.ensureListingExists(listingId);
    return this.prisma.availabilityBlock.findMany({
      where: { listingId },
      orderBy: { startAt: 'asc' },
    });
  }

  async getCalendar(listingId: string, startAt: Date, endAt: Date) {
    await this.ensureListingExists(listingId);
    if (!this.isValidDate(startAt) || !this.isValidDate(endAt)) {
      throw new BadRequestException('startAt and endAt must be valid dates');
    }
    if (startAt >= endAt) {
      throw new BadRequestException('startAt must be before endAt');
    }

    const [blocks, confirmedBookings] = await Promise.all([
      this.prisma.availabilityBlock.findMany({
        where: { listingId },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          listingId,
          status: BookingStatus.CONFIRMED,
        },
        orderBy: { startAt: 'asc' },
      }),
    ]);

    const calendarDays = this.buildCalendarDays(startAt, endAt, blocks, confirmedBookings);

    return {
      listingId,
      startAt,
      endAt,
      unavailableBlocks: blocks,
      confirmedBookings,
      calendar: calendarDays,
    };
  }

  private buildCalendarDays(
    startAt: Date,
    endAt: Date,
    blocks: Array<{ startAt: Date; endAt: Date }>,
    bookings: Array<{ startAt: Date; endAt: Date }>,
  ) {
    const normalizedStart = this.normalizeDate(startAt);
    const normalizedEnd = this.normalizeDate(new Date(endAt.getTime() - 1));
    const days: Array<{ date: string; available: boolean }> = [];
    let current = new Date(normalizedStart);
    while (current <= normalizedEnd) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      const isUnavailable = blocks.some((block) => overlaps(dayStart, dayEnd, block.startAt, block.endAt))
        || bookings.some((booking) => overlaps(dayStart, dayEnd, booking.startAt, booking.endAt));
      days.push({
        date: dayStart.toISOString().slice(0, 10),
        available: !isUnavailable,
      });
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    return days;
  }

  private isValidDate(date: Date) {
    return !Number.isNaN(date.getTime());
  }

  private normalizeDate(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  async createBlock(
    listingId: string,
    startAt: Date,
    endAt: Date,
    reason: string | undefined,
    ownerId: string,
  ) {
    await this.ensureListingOwnedBy(listingId, ownerId);
    if (startAt >= endAt) {
      throw new BadRequestException('startAt must be before endAt');
    }

    const existing = await this.prisma.availabilityBlock.findMany({
      where: { listingId },
    });
    for (const b of existing) {
      if (overlaps(startAt, endAt, b.startAt, b.endAt)) {
        throw new BadRequestException(
          'This block overlaps with an existing availability block',
        );
      }
    }

    return this.prisma.availabilityBlock.create({
      data: { listingId, startAt, endAt, reason },
    });
  }

  async deleteBlock(listingId: string, blockId: string, ownerId: string) {
    await this.ensureListingOwnedBy(listingId, ownerId);
    const block = await this.prisma.availabilityBlock.findFirst({
      where: { id: blockId, listingId },
    });
    if (!block) {
      throw new NotFoundException('Availability block not found');
    }
    await this.prisma.availabilityBlock.delete({
      where: { id: blockId },
    });
    return { deleted: true };
  }

  private async ensureListingExists(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
  }

  private async ensureListingOwnedBy(listingId: string, ownerId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.ownerId !== ownerId) {
      throw new ForbiddenException('Only the listing owner can perform this action');
    }
  }
}
