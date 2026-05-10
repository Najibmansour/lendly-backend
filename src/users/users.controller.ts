import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('users')
@Controller('v1/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: JwtUser) {
    return this.users.findMe(user.id);
  }

  @Get('me/tos-agreement-latest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user latest TOS agreement' })
  getMyLatestTosAgreement(@CurrentUser() user: JwtUser) {
    return this.users.findLatestTosAgreement(user.id);
  }

  @Get(':id/tos-agreements')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a user TOS agreement audit trail (admin only)',
  })
  getUserTosAgreements(@Param('id') id: string) {
    return this.users.findTosAgreements(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (public: id, name, createdAt)' })
  findOne(@Param('id') id: string) {
    return this.users.findOnePublic(id);
  }
}
