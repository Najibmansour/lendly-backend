import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { UnitPreference } from '../pricing/pricing.types';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async createQuote(dto: CreateQuoteDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (startAt >= endAt) {
      throw new BadRequestException('startAt must be before endAt');
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.status === ListingStatus.DELETED) {
      throw new BadRequestException('Listing is deleted');
    }

    const unitPref: UnitPreference | undefined =
      dto.unitPreference === 'AUTO' ? undefined : dto.unitPreference;

    try {
      return this.pricing.computeQuote(
        listing.id,
        startAt,
        endAt,
        {
          hourlyRate: listing.hourlyRate,
          dailyRate: listing.dailyRate,
          weeklyRate: listing.weeklyRate,
          monthlyRate: listing.monthlyRate,
        },
        unitPref,
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'Listing has no rates set') {
        throw new BadRequestException('Listing has no rates set');
      }
      throw err;
    }
  }
}
