import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HomeQueryDto } from './dto/home-query.dto';
import { ListingsService } from '../listings/listings.service';
import { BookingStatus, ListingStatus } from '@prisma/client';

const PRICE_SORT_FETCH_LIMIT = 1000;

function minAvailableRate(listing: any): number | null {
  const toN = (v: unknown) => (v != null ? Number(v) : NaN);
  const nums = [
    toN(listing.hourlyRate),
    toN(listing.dailyRate),
    toN(listing.weeklyRate),
  ].filter((n) => !Number.isNaN(n) && n >= 0);
  return nums.length > 0 ? Math.min(...nums) : null;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listingsService: ListingsService,
  ) {}

  private mapListingToHomeCard(listing: any) {
    const minRate = minAvailableRate(listing);
    const mainImage =
      listing.imageUrl ?? (listing.images && listing.images[0]) ?? null;
    return {
      id: listing.id,
      title: listing.title,
      category: listing.category,
      city: listing.city,
      address: listing.address,
      mainImage,
      images: listing.images ?? [],
      minRate,
      hourlyRate: listing.hourlyRate ?? null,
      dailyRate: listing.dailyRate ?? null,
      weeklyRate: listing.weeklyRate ?? null,
      owner: listing.owner
        ? {
            id: listing.owner.id,
            firstName: listing.owner.firstName,
            lastName: listing.owner.lastName,
          }
        : null,
      createdAt: listing.createdAt,
    };
  }

  private normalizeCity(city?: string): string | undefined {
    if (!city) return undefined;
    return city.trim();
  }

  async getBanners() {
    return [
      {
        id: 'rent-instead-buy',
        title: 'Rent what you need',
        subtitle: 'Save money by renting items near you.',
        ctaLabel: 'Explore',
        targetType: 'search',
        targetValue: null,
      },
    ];
  }

  async getCategories(city?: string) {
    const where: any = { status: { not: ListingStatus.DELETED } };
    if (city) where.city = city;
    const groups = await this.prisma.listing.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return groups.map((g: any) => ({ name: g.category, count: g._count.id }));
  }

  async getRecentlyAdded(city: string | undefined, limit: number) {
    const where: any = { status: { not: ListingStatus.DELETED } };
    if (city) where.city = city;
    const listings = await this.prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return listings.map((l) => this.mapListingToHomeCard(l));
  }

  async getAffordablePicks(city: string | undefined, limit: number) {
    const where: any = { status: { not: ListingStatus.DELETED } };
    if (city) where.city = city;
    // require at least one rate
    where.OR = [
      { hourlyRate: { not: null } },
      { dailyRate: { not: null } },
      { weeklyRate: { not: null } },
    ];
    const all = await this.prisma.listing.findMany({
      where,
      take: PRICE_SORT_FETCH_LIMIT,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const withMin = all
      .map((l) => ({ listing: l, minRate: minAvailableRate(l) }))
      .filter((x) => x.minRate != null) as Array<{
      listing: any;
      minRate: number;
    }>;
    withMin.sort((a, b) => a.minRate - b.minRate);
    return withMin
      .slice(0, limit)
      .map((x) => this.mapListingToHomeCard(x.listing));
  }

  private normalizeDayRange(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private async isListingAvailableBetween(
    listingId: string,
    startAt: Date,
    endAt: Date,
  ) {
    const [blocks, bookings] = await Promise.all([
      this.prisma.availabilityBlock.findMany({ where: { listingId } }),
      this.prisma.booking.findMany({
        where: { listingId, status: BookingStatus.CONFIRMED },
      }),
    ]);
    for (const b of blocks) {
      if (overlaps(startAt, endAt, b.startAt, b.endAt)) return false;
    }
    for (const bk of bookings) {
      if (overlaps(startAt, endAt, bk.startAt, bk.endAt)) return false;
    }
    return true;
  }

  async getAvailableToday(city: string | undefined, limit: number) {
    const where: any = { status: { not: ListingStatus.DELETED } };
    if (city) where.city = city;
    const candidates = await this.prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const todayStart = this.normalizeDayRange(new Date());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const results: any[] = [];
    for (const c of candidates) {
      if (results.length >= limit) break;
      const ok = await this.isListingAvailableBetween(
        c.id,
        todayStart,
        todayEnd,
      );
      if (ok) results.push(this.mapListingToHomeCard(c));
    }
    return results;
  }

  async getPopularThisWeek(city: string | undefined, limit: number) {
    const where: any = { status: { not: ListingStatus.DELETED } };
    if (city) where.city = city;
    where.images = { isEmpty: false } as any;
    // require at least one rate as heuristic
    where.OR = [
      { hourlyRate: { not: null } },
      { dailyRate: { not: null } },
      { weeklyRate: { not: null } },
    ];
    const listings = await this.prisma.listing.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return listings.map((l) => this.mapListingToHomeCard(l));
  }

  async getFeedPreview(city: string | undefined, limit: number) {
    const query: any = { city, page: 1, limit, sort: 'newest' };
    const resp = await this.listingsService.findAll(query);
    return {
      items: resp.items.map((i: any) => this.mapListingToHomeCard(i)),
      page: resp.page,
      limit: resp.limit,
      total: resp.total,
      nextPage: resp.page * resp.limit < resp.total ? resp.page + 1 : null,
    };
  }

  async getHome(query: HomeQueryDto) {
    const city = this.normalizeCity(query.city);
    const limit = query.limitPerSection ?? 10;

    const [
      banners,
      categories,
      recentlyAdded,
      affordablePicks,
      popularThisWeek,
      feedPreview,
    ] = await Promise.all([
      this.getBanners(),
      this.getCategories(city),
      this.getRecentlyAdded(city, limit),
      this.getAffordablePicks(city, limit),
      this.getPopularThisWeek(city, limit),
      this.getFeedPreview(city, Math.max(limit, 20)),
    ]);

    const availableToday = await this.getAvailableToday(city, limit);

    return {
      city: city ?? null,
      generatedAt: new Date().toISOString(),
      sections: {
        banners,
        categories,
        recentlyAdded,
        availableToday,
        affordablePicks,
        popularThisWeek,
        feedPreview,
      },
    };
  }
}
