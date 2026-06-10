// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from '../email/email.module';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const accessSecret = config.get<string>('JWT_ACCESS_SECRET');
        const refreshSecret = config.get<string>('JWT_REFRESH_SECRET');
        if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is not set');
        if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not set');
        const expiresIn = config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
        return {
          secret: accessSecret,
          signOptions: { expiresIn: expiresIn as any },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordResetService],
  exports: [AuthService],
})
export class AuthModule {}
