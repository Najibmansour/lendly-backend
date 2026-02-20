import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
