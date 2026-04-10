import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toDecimalOrUndefined } from '../common/decimal.util';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';

const PRICE_SORT_FETCH_LIMIT = 1000;

function minAvailableRate(listing: {
  hourlyRate: unknown;
  dailyRate: unknown;
  weeklyRate: unknown;
}): number | null {
  const toN = (v: unknown) => (v != null ? Number(v) : NaN);
  const nums = [toN(listing.hourlyRate), toN(listing.dailyRate), toN(listing.weeklyRate)].filter((n) => !Number.isNaN(n) && n >= 0);
  return nums.length > 0 ? Math.min(...nums) : null;
}

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateListingDto) {
    const hasRate =
      dto.hourlyRate != null ||
      dto.dailyRate != null ||
      dto.weeklyRate != null;
    if (!hasRate) {
      throw new BadRequestException('Listing must have at least one rate set (hourly, daily, or weekly)');
    }

    return this.prisma.listing.create({
      data: {
        ownerId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        city: dto.city,
        imageUrl: dto.imageUrl,
        hourlyRate: toDecimalOrUndefined(dto.hourlyRate),
        dailyRate: toDecimalOrUndefined(dto.dailyRate),
        weeklyRate: toDecimalOrUndefined(dto.weeklyRate),
      },
    });
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  async findAll(query: ListListingsQueryDto) {
    const { search, category, city, page = 1, limit = 20, sort = 'newest' } = query;
    const where: Prisma.ListingWhereInput = {
      status: { not: ListingStatus.DELETED },
    };
    if (category) where.category = category;
    if (city) where.city = city;
    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (sort === 'newest') {
      const [items, total] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { owner: { select: { id: true, firstName: true, lastName: true } } },
        }),
        this.prisma.listing.count({ where }),
      ]);
      return { items, total, page, limit };
    }

    if (sort === 'price') {
      const all = await this.prisma.listing.findMany({
        where,
        take: PRICE_SORT_FETCH_LIMIT,
        include: { owner: { select: { id: true, firstName: true, lastName: true } } },
      });
      const withMinRate = all
        .map((l) => ({ listing: l, minRate: minAvailableRate(l) }))
        .filter((x) => x.minRate != null) as { listing: (typeof all)[0]; minRate: number }[];
      withMinRate.sort((a, b) => a.minRate - b.minRate);
      const total = withMinRate.length;
      const start = (page - 1) * limit;
      const items = withMinRate.slice(start, start + limit).map((x) => x.listing);
      return { items, total, page, limit };
    }

    throw new BadRequestException('Invalid sort parameter');
  }

  async update(id: string, dto: UpdateListingDto) {
    const data: Prisma.ListingUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.hourlyRate !== undefined) data.hourlyRate = toDecimalOrUndefined(dto.hourlyRate);
    if (dto.dailyRate !== undefined) data.dailyRate = toDecimalOrUndefined(dto.dailyRate);
    if (dto.weeklyRate !== undefined) data.weeklyRate = toDecimalOrUndefined(dto.weeklyRate);

    return this.prisma.listing.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.DELETED },
    });
  }
}
