import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug } from '../common/slug.util';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ListTagsQueryDto } from './dto/list-tags-query.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTagDto, adminId: string) {
    const slug = generateSlug(dto.name);

    // Check if slug already exists
    const existingTag = await this.prisma.tag.findUnique({
      where: { slug },
    });

    if (existingTag) {
      throw new BadRequestException(`Tag with slug "${slug}" already exists`);
    }

    const tag = await this.prisma.tag.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        isActive: dto.isActive ?? true,
        createdById: adminId,
        updatedById: adminId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.formatTagResponse(tag);
  }

  async findAll(query: ListTagsQueryDto) {
    const { search, includeInactive, page = 1, limit = 50 } = query;
    const where: Prisma.TagWhereInput = {};

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
      this.prisma.tag.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          updatedBy: { select: { id: true, firstName: true, lastName: true } },
          listingTags: { select: { id: true } },
        },
      }),
      this.prisma.tag.count({ where }),
    ]);

    return {
      items: items.map((item) => this.formatTagResponseWithCount(item)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return this.formatTagResponse(tag);
  }

  async update(id: string, dto: UpdateTagDto, adminId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // If name is being updated, regenerate slug
    let slug = tag.slug;
    if (dto.name && dto.name !== tag.name) {
      slug = generateSlug(dto.name);
      const slugExists = await this.prisma.tag.findUnique({
        where: { slug },
      });
      if (slugExists && slugExists.id !== id) {
        throw new BadRequestException(
          `Tag with slug "${slug}" already exists`,
        );
      }
    }

    const updated = await this.prisma.tag.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        isActive: dto.isActive,
        updatedById: adminId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.formatTagResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Soft delete: mark as deleted
    await this.prisma.tag.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  async getPublicTags() {
    return this.prisma.tag.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });
  }

  async getTagsByIds(tagIds: string[]): Promise<any[]> {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    const tags = await this.prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        isActive: true,
        deletedAt: null,
      },
    });

    return tags;
  }

  async validateTagIds(tagIds: string[]): Promise<boolean> {
    if (!tagIds || tagIds.length === 0) {
      return true;
    }

    if (tagIds.length > 5) {
      throw new BadRequestException('Maximum 5 tags per listing');
    }

    // Check for duplicates
    if (new Set(tagIds).size !== tagIds.length) {
      throw new BadRequestException('Duplicate tag IDs are not allowed');
    }

    const tags = await this.prisma.tag.findMany({
      where: {
        id: { in: tagIds },
      },
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException('One or more tags do not exist');
    }

    const inactiveTags = tags.filter((t) => !t.isActive || t.deletedAt);
    if (inactiveTags.length > 0) {
      throw new BadRequestException('One or more tags are inactive');
    }

    return true;
  }

  private formatTagResponse(tag: any) {
    const { ...data } = tag;
    return {
      ...data,
      createdBy: tag.createdBy || undefined,
      updatedBy: tag.updatedBy || undefined,
    };
  }

  private formatTagResponseWithCount(tag: any) {
    const { listingTags, ...data } = tag;
    return {
      ...data,
      listingCount: listingTags?.length || 0,
      createdBy: tag.createdBy || undefined,
      updatedBy: tag.updatedBy || undefined,
    };
  }
}
