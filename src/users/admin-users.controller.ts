import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from './users.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';

@ApiTags('admin-users')
@Controller('v1/admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AdminAuditService,
  ) {}

  @Post(':id/anonymize')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Anonymize another user account (admin only)' })
  async anonymize(@Param('id') id: string, @CurrentUser() admin: JwtUser) {
    const res = await this.users.anonymizeUser(id);
    try {
      await this.audit.log({
        adminId: admin.id,
        action: 'anonymize_user',
        targetType: 'user',
        targetId: id,
        metadata: { via: 'admin_api' },
      });
    } catch (err) {
      // do not block anonymization if audit fails
    }
    return res;
  }
}
