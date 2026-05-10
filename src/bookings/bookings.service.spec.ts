import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { validateSync } from 'class-validator';
import { BookingsService } from './bookings.service';
import { CompletionParty } from './dto/complete-booking.dto';
import { CreateBookingIssueDto } from './dto/create-booking-issue.dto';

describe('BookingsService', () => {
  const pricing = {
    computeQuote: jest.fn(),
  };

  const prisma = {
    $transaction: jest.fn(),
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    bookingIssue: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    availabilityBlock: {
      findMany: jest.fn(),
    },
  };

  let service: BookingsService;

  const baseBooking = {
    id: 'booking-1',
    listingId: 'listing-1',
    renterId: 'renter-1',
    ownerId: 'owner-1',
    startAt: new Date('2026-05-01T10:00:00.000Z'),
    endAt: new Date('2026-05-01T12:00:00.000Z'),
    expiresAt: null,
    status: BookingStatus.CONFIRMED,
    renterConfirmedAt: null,
    ownerConfirmedAt: null,
    listing: { id: 'listing-1', title: 'Bike' },
    renter: { id: 'renter-1', firstName: 'Ren', lastName: 'Ter' },
    owner: { id: 'owner-1', firstName: 'Own', lastName: 'Er' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(prisma as any, pricing as any);
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));
  });

  describe('completeBooking', () => {
    it('renter cannot complete before booking end date', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce({
        ...baseBooking,
        endAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.completeBooking('booking-1', 'renter-1', {
          party: CompletionParty.RENTER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('owner cannot complete before booking end date', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce({
        ...baseBooking,
        endAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.completeBooking('booking-1', 'owner-1', {
          party: CompletionParty.OWNER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('non-participant cannot complete', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce(baseBooking);

      await expect(
        service.completeBooking('booking-1', 'other-user', {
          party: CompletionParty.RENTER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('renter confirms after end date and status remains CONFIRMED', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce({
        ...baseBooking,
        endAt: new Date(Date.now() - 60_000),
      });
      prisma.booking.update.mockResolvedValueOnce({
        ...baseBooking,
        renterConfirmedAt: new Date(),
        status: BookingStatus.CONFIRMED,
      });

      const result = await service.completeBooking('booking-1', 'renter-1', {
        party: CompletionParty.RENTER,
      });

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(result.completion.renterConfirmedAt).not.toBeNull();
      expect(result.completion.ownerConfirmedAt).toBeNull();
    });

    it('owner confirms second and status becomes COMPLETED', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce({
        ...baseBooking,
        renterConfirmedAt: new Date(Date.now() - 120_000),
        endAt: new Date(Date.now() - 60_000),
      });
      prisma.booking.update.mockResolvedValueOnce({
        ...baseBooking,
        renterConfirmedAt: new Date(Date.now() - 120_000),
        ownerConfirmedAt: new Date(),
        status: BookingStatus.COMPLETED,
      });

      const result = await service.completeBooking('booking-1', 'owner-1', {
        party: CompletionParty.OWNER,
      });

      expect(result.status).toBe(BookingStatus.COMPLETED);
      expect(result.completion.renterConfirmedAt).not.toBeNull();
      expect(result.completion.ownerConfirmedAt).not.toBeNull();
    });

    it('repeat same-party confirmation is idempotent', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce({
        ...baseBooking,
        renterConfirmedAt: new Date(Date.now() - 120_000),
        endAt: new Date(Date.now() - 60_000),
      });

      const result = await service.completeBooking('booking-1', 'renter-1', {
        party: CompletionParty.RENTER,
      });

      expect(prisma.booking.update).not.toHaveBeenCalled();
      expect(result.completion.renterConfirmedAt).not.toBeNull();
    });
  });

  describe('issues', () => {
    it('participant can create issue', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce(baseBooking);
      prisma.bookingIssue.create.mockResolvedValueOnce({
        id: 'issue-1',
        bookingId: 'booking-1',
        authorId: 'renter-1',
        message: 'Item damaged',
        category: 'damage',
      });

      const result = await service.createBookingIssue('booking-1', 'renter-1', {
        message: 'Item damaged',
        category: 'damage',
      });

      expect(result.id).toBe('issue-1');
    });

    it('participant can list issues', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce(baseBooking);
      prisma.bookingIssue.findMany.mockResolvedValueOnce([
        { id: 'issue-2', createdAt: new Date() },
        { id: 'issue-1', createdAt: new Date(Date.now() - 1000) },
      ]);

      const result = await service.getBookingIssues('booking-1', 'owner-1');
      expect(result).toHaveLength(2);
      expect(prisma.bookingIssue.findMany).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('non-participant cannot create/list issues', async () => {
      prisma.booking.findUnique.mockResolvedValue(baseBooking);

      await expect(
        service.createBookingIssue('booking-1', 'other-user', { message: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.getBookingIssues('booking-1', 'other-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('empty message is rejected by DTO validation', () => {
      const dto = new CreateBookingIssueDto();
      dto.message = '';
      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('regression: accept/decline/cancel', () => {
    it('accept still requires pending and moves to CONFIRMED', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.PENDING,
        paymentStatus: 'HOLD',
      });
      prisma.availabilityBlock.findMany.mockResolvedValueOnce([]);
      prisma.booking.findMany.mockResolvedValueOnce([]);
      prisma.booking.update.mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
      });

      const result = await service.accept('booking-1', 'owner-1');
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('decline still works from pending', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.PENDING,
      });
      prisma.booking.update.mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.DECLINED,
      });

      const result = await service.decline('booking-1', 'owner-1');
      expect(result.status).toBe(BookingStatus.DECLINED);
    });

    it('cancel still works from pending or confirmed', async () => {
      prisma.booking.findUnique.mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
      });
      prisma.booking.update.mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CANCELLED,
      });

      const result = await service.cancel('booking-1', 'renter-1');
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });
  });
});
