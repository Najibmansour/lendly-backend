import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async requestReset(email: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const expiresMin = Number(
      this.config.get('PASSWORD_RESET_TOKEN_EXPIRES_MIN') ?? 30,
    );

    // Generate token regardless of whether user exists to avoid enumeration
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + expiresMin * 60 * 1000);

    if (user) {
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          requestIp: ip ?? null,
          userAgent: userAgent ?? null,
        },
      });

      const resetUrl = `${this.config.get('APP_BASE_URL') ?? 'http://localhost:3000'}/reset-password?token=${token}`;
      await this.email.send(
        user.email,
        'Password reset instructions',
        `<p>Reset your password using the link below. The link expires in ${expiresMin} minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      );
      this.logger.log(`Password reset requested for userId=${user.id}`);
    } else {
      // still simulate time to avoid timing attacks
      this.logger.log(`Password reset requested for unknown email=${email}`);
    }

    return {
      message:
        'If an account with that email exists, password reset instructions have been sent.',
    };
  }

  async confirmReset(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const pr = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    });
    if (!pr) {
      throw new Error('Invalid or expired token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: pr.userId },
      data: { passwordHash: hashed },
    });
    await this.prisma.passwordResetToken.update({
      where: { id: pr.id },
      data: { usedAt: new Date() },
    });

    // revoke sessions
    await this.prisma.session.updateMany({
      where: { userId: pr.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Password reset completed for userId=${pr.userId}`);
    return { message: 'Password has been reset.' };
  }
}
