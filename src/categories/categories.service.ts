import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug, generateUniqueSlug } from '../common/slug.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, adminId: string) {
    const slug = generateSlug(dto.name);

    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new BadRequestException(
        `Category with slug "${slug}" already exists`,
      );
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        createdById: adminId,
        updatedById: adminId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.formatCategoryResponse(category);
  }

  async findAll(query: ListCategoriesQueryDto) {
    const { search, includeInactive, page = 1, limit = 50 } = query;
    const where: Prisma.CategoryWhereInput = {};

    if (!includeInactive) {
      where.isActive = true;
      where.deletedAt = null;
    } else {
      where.deletedAt = null;
    }

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          updatedBy: { select: { id: true, firstName: true, lastName: true } },
          listings: { select: { id: true } },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items: items.map((item) => this.formatCategoryResponseWithCount(item)),
      total,
      page,
      limit,
    };
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (!category || category.deletedAt || !category.isActive) {
      throw new NotFoundException('Category not found');
    }

    return this.formatCategoryResponse(category);
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.formatCategoryResponse(category);
  }

  async update(id: string, dto: UpdateCategoryDto, adminId: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // If name is being updated, regenerate slug
    let slug = category.slug;
    if (dto.name && dto.name !== category.name) {
      slug = generateSlug(dto.name);
      const slugExists = await this.prisma.category.findUnique({
        where: { slug },
      });
      if (slugExists && slugExists.id !== id) {
        throw new BadRequestException(
          `Category with slug "${slug}" already exists`,
        );
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        updatedById: adminId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.formatCategoryResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { listings: { select: { id: true } } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Prevent deleting the fallback "Other" category
    if (category.slug === 'other') {
      throw new ForbiddenException(
        'Cannot delete the default "Other" category',
      );
    }

    // Prevent disabling if no other active category exists
    if (category.isActive) {
      const otherActive = await this.prisma.category.findFirst({
        where: {
          id: { not: id },
          isActive: true,
          deletedAt: null,
        },
      });

      if (!otherActive) {
        throw new BadRequestException('Cannot delete the last active category');
      }
    }

    // Soft delete: mark as deleted
    await this.prisma.category.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  async getPublicCategories() {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        color: true,
        sortOrder: true,
      },
    });
  }

  async getCategoryIdBySlug(slug: string): Promise<string> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (!category || category.deletedAt || !category.isActive) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category.id;
  }

  private formatCategoryResponse(category: any) {
    const { ...data } = category;
    return {
      ...data,
      createdBy: category.createdBy || undefined,
      updatedBy: category.updatedBy || undefined,
    };
  }

  private formatCategoryResponseWithCount(category: any) {
    const { listings, ...data } = category;
    return {
      ...data,
      listingCount: listings?.length || 0,
      createdBy: category.createdBy || undefined,
      updatedBy: category.updatedBy || undefined,
    };
  }
}
