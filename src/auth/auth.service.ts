import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenPayload } from './auth.types';

const SALT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
      },
    });
    return this.createSession(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (
      !user ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.createSession(user.id, user.email);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId! },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.userId !== payload.sub
    ) {
      throw new UnauthorizedException('Invalid or revoked session');
    }
    if (!(await bcrypt.compare(refreshToken, session.refreshTokenHash))) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.revokeSession(session.id);
    return this.createSession(session.userId, session.user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      if (payload.sessionId) {
        await this.revokeSession(payload.sessionId);
      }
    } catch {
      // ignore invalid token on logout
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
  private async createSession(
    userId: string,
    email: string,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthTokens> {
    const placeholderHash = await bcrypt.hash(
      `${userId}:${Date.now()}:${Math.random()}`,
      SALT_ROUNDS,
    );
  
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: placeholderHash,
        userAgent,
        ip,
      },
    });
  
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is not set');
  
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not set');
  
    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';
  
    const accessToken = this.jwt.sign(
      { sub: userId, email, type: 'access' } as TokenPayload,
      { secret: accessSecret, expiresIn: accessExpiresIn as any },
    );
  
    const refreshToken = this.jwt.sign(
      { sub: userId, email, type: 'refresh', sessionId: session.id } as TokenPayload,
      { secret: refreshSecret, expiresIn: refreshExpiresIn as any },
    );
  
    const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });
  
    const expiresInSeconds = this.parseExpiresIn(accessExpiresIn);
  
    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }
  

  private async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwt.verify<TokenPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      if (payload.type !== 'refresh' || !payload.sessionId) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * (multipliers[unit] ?? 60);
  }
}
