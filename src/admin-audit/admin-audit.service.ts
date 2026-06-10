import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: {
    adminId: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: any;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.adminAuditLog.create({ data: entry as any });
  }
}
