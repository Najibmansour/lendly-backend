import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseFloatPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { ListingOwnerGuard } from './guards/listing-owner.guard';
import { ListingsService } from './listings.service';
import { AvailabilityService } from './availability.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';

@ApiTags('listings')
@Controller('v1/listings')
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly availability: AvailabilityService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a listing (JWT)' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateListingDto) {
    return this.listings.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List listings (excludes DELETED). sort=price: in-memory sort; pagination for price is over fetched set.',
  })
  findAll(@Query() query: ListListingsQueryDto) {
    return this.listings.findAll(query);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability blocks for a listing' })
  getAvailability(@Param('id') id: string) {
    return this.availability.getBlocks(id);
  }

  @Post(':id/availability/blocks')
  @UseGuards(JwtAuthGuard, ListingOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add availability block (owner only)' })
  createAvailabilityBlock(
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityBlockDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.availability.createBlock(
      id,
      new Date(dto.startAt),
      new Date(dto.endAt),
      dto.reason,
      user.id,
    );
  }

  @Delete(':id/availability/blocks/:blockId')
  @UseGuards(JwtAuthGuard, ListingOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete availability block (owner only)' })
  deleteAvailabilityBlock(
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.availability.deleteBlock(id, blockId, user.id);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'List nearby listings (future radius filtering)' })
  findNearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
  ) {
    return this.listings.findNearby(lat, lng);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  findOne(@Param('id') id: string) {
    return this.listings.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ListingOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing (owner only)' })
  update(@Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listings.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ListingOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete listing (owner only; sets status=DELETED)' })
  remove(@Param('id') id: string) {
    return this.listings.softDelete(id);
  }
}
