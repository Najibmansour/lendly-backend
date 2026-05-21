import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        acceptedTosId: true,
        acceptedTos: {
          select: {
            id: true,
            version: true,
            locale: true,
            checksum: true,
            isActive: true,
            requiresReacceptance: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findTosAgreements(userId: string) {
    return this.prisma.tosAgreement.findMany({
      where: { userId },
      orderBy: { agreedAt: 'desc' },
      include: {
        tosVersion: {
          select: {
            id: true,
            version: true,
            locale: true,
            checksum: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findLatestTosAgreement(userId: string) {
    return this.prisma.tosAgreement.findFirst({
      where: { userId },
      orderBy: { agreedAt: 'desc' },
      include: {
        tosVersion: {
          select: {
            id: true,
            version: true,
            locale: true,
            checksum: true,
            isActive: true,
          },
        },
      },
    });
  }

  async getMyData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        consentVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { user };
  }

  async requestDeletion(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: new Date() },
    });

    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      message: 'Your account deletion request has been recorded.',
    };
  }

  async anonymizeUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        email: `deleted-user-${id}@deleted.local`,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        consentIp: null,
        consentUserAgent: null,
        deletedAt: new Date(),
        anonymizedAt: new Date(),
      },
    });

    await this.prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      message: 'User has been anonymized successfully.',
    };
  }

  async findOnePublic(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
