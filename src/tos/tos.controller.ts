import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TosService } from './tos.service';
import { CreateTosDto } from './dto/create-tos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';

@ApiTags('tos')
@Controller('v1/tos')
export class TosController {
  constructor(private readonly tosService: TosService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current active Terms of Service' })
  getCurrent(@Query('locale') locale = 'en') {
    return this.tosService.getCurrentTos(locale);
  }

  @Get(':version')
  @ApiOperation({ summary: 'Get a specific Terms of Service version' })
  getVersion(
    @Param('version', ParseIntPipe) version: number,
    @Query('locale') locale = 'en',
  ) {
    return this.tosService.getTosVersion(version, locale);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new Terms of Service version (admin only)',
  })
  create(@Body() dto: CreateTosDto, @CurrentUser() user: JwtUser) {
   
    return this.tosService.createTosVersion(dto, user.id);
  }
}
