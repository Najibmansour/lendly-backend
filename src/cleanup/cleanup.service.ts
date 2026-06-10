import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // Runs daily and anonymizes users who requested deletion and passed the grace period.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyAnonymize() {
    const days = Number(this.config.get('ACCOUNT_DELETION_GRACE_DAYS') ?? 30);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    try {
      const users = await this.prisma.user.findMany({
        where: {
          deletionRequestedAt: { lt: cutoff },
          anonymizedAt: null,
          deletedAt: null,
        },
        select: { id: true },
      });
      for (const u of users) {
        await this.prisma.user.update({
          where: { id: u.id },
          data: {
            email: `deleted-user-${u.id}@deleted.local`,
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
          where: { userId: u.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        // record audit log (system)
        try {
          await this.prisma.adminAuditLog.create({
            data: {
              adminId: 'system',
              action: 'auto_anonymize',
              targetType: 'user',
              targetId: u.id,
              metadata: { reason: 'deletion_grace_elapsed', graceDays: days },
            },
          });
        } catch (err) {
          this.logger.warn(
            'Failed to write admin audit log for auto-anonymize',
            err,
          );
        }
      }
      this.logger.log(
        `Anonymized ${users.length} users older than ${days} days`,
      );
    } catch (err) {
      this.logger.error('Scheduled anonymization failed', err);
    }
  }
}
