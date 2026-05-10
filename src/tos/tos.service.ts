import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTosDto } from './dto/create-tos.dto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'legal', 'tos');
const MAX_CONTENT_BYTES = 200_000;
const LOCALE_PATTERN = /^[a-z]{2}$/i;

@Injectable()
export class TosService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentTos(locale = 'en') {
    return this.prisma.termsOfService.findFirst({
      where: { locale: locale.toLowerCase(), isActive: true },
      orderBy: { version: 'desc' },
    });
  }

  async getTosVersion(version: number, locale = 'en') {
    return this.prisma.termsOfService.findFirst({
      where: { version, locale: locale.toLowerCase() },
    });
  }

  async createTosVersion(dto: CreateTosDto, createdById: string) {
    const locale = this.normalizeLocale(dto.locale);
    const content = this.sanitizeContent(dto.content);
    const requiredReacceptance = dto.requiresReacceptance ?? false;

    const latest = await this.prisma.termsOfService.findFirst({
      where: { locale },
      orderBy: { version: 'desc' },
    });
    const version = latest ? latest.version + 1 : 1;
    const fileName = `v${version}_${locale}.md`;
    const filePath = path.join(STORAGE_DIR, fileName);
    const checksum = this.calculateChecksum(content);

    await this.saveTosToFile(filePath, content);

    try {
      return await this.prisma.termsOfService.create({
        data: {
          version,
          filePath,
          checksum,
          locale,
          isActive: true,
          requiresReacceptance: requiredReacceptance,
          createdById,
          publishedAt: new Date(),
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to create Terms of Service version',
      );
    }
  }

  calculateChecksum(content: string) {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  async saveTosToFile(filePath: string, content: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }

  sanitizeContent(content: string) {
    if (
      !content ||
      typeof content !== 'string' ||
      content.trim().length === 0
    ) {
      throw new BadRequestException('TOS content is required');
    }

    const trimmed = content.trim();
    const bytes = Buffer.byteLength(trimmed, 'utf8');
    if (bytes > MAX_CONTENT_BYTES) {
      throw new BadRequestException('TOS content is too large');
    }

    if (
      /<script[\s\S]*?>/i.test(trimmed) ||
      /<\s*iframe/i.test(trimmed) ||
      /on\w+\s*=/.test(trimmed)
    ) {
      throw new BadRequestException(
        'TOS content contains disallowed HTML or script content',
      );
    }

    return trimmed;
  }

  normalizeLocale(locale?: string) {
    const normalized = (locale ?? 'en').trim().toLowerCase();
    if (!LOCALE_PATTERN.test(normalized)) {
      throw new BadRequestException(
        'Locale must be a two-letter language code',
      );
    }
    return normalized;
  }
}
