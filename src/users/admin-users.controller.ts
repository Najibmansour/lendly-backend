import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from './users.service';

@ApiTags('admin-users')
@Controller('v1/admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Post(':id/anonymize')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Anonymize another user account (admin only)' })
  anonymize(@Param('id') id: string) {
    return this.users.anonymizeUser(id);
  }
}
