import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtUser } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthTokens> {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : Array.isArray(forwarded)
          ? forwarded[0]?.split(',')[0].trim()
          : req.socket.remoteAddress;
    const userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'];
    return this.auth.register(dto, ip, userAgent);
  }

  @Post('login')
  @Throttle({ default: { limit: 8, ttl: 60 } })
  @ApiOperation({ summary: 'Login' })
  login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokens> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (revoke refresh session)' })
  logout(@Body() dto: LogoutDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user (requires JWT)' })
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.id);
  }

  @Post('password/request')
  @Throttle({ default: { limit: 5, ttl: 3600 } })
  @ApiOperation({ summary: 'Request password reset (no account enumeration)' })
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: Request,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : Array.isArray(forwarded)
          ? forwarded[0]?.split(',')[0].trim()
          : req.socket.remoteAddress;
    const userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'];
    return this.passwordReset.requestReset(
      dto.email,
      ip as string,
      userAgent as string,
    );
  }

  @Post('password/confirm')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @ApiOperation({ summary: 'Confirm password reset with token' })
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.passwordReset.confirmReset(dto.token, dto.password);
  }
}
