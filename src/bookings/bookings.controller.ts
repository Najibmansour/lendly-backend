import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { BookingOwnerGuard } from './guards/booking-owner.guard';
import { BookingRenterGuard } from './guards/booking-renter.guard';
import { BookingParticipantGuard } from './guards/booking-participant.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { UpdateBookingPaymentDto } from './dto/update-booking-payment.dto';
import { CompleteBookingDto } from './dto/complete-booking.dto';
import { CreateBookingIssueDto } from './dto/create-booking-issue.dto';

@ApiTags('bookings')
@Controller('v1/bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking (JWT)' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Post(':id/payment')
  @UseGuards(BookingRenterGuard)
  @ApiOperation({ summary: 'Update booking payment/hold info (renter only)' })
  updatePayment(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateBookingPaymentDto,
  ) {
    return this.bookings.updatePayment(id, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my bookings; role=renter|owner' })
  findAll(@CurrentUser() user: JwtUser, @Query() query: ListBookingsQueryDto) {
    return this.bookings.findAll(user.id, query.role ?? 'renter');
  }

  @Get(':id')
  @UseGuards(BookingParticipantGuard)
  @ApiOperation({ summary: 'Get booking by ID (renter or owner only)' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.bookings.findOne(id, user.id);
  }

  @Post(':id/accept')
  @UseGuards(BookingOwnerGuard)
  @ApiOperation({ summary: 'Accept booking (owner only)' })
  accept(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.bookings.accept(id, user.id);
  }

  @Post(':id/decline')
  @UseGuards(BookingOwnerGuard)
  @ApiOperation({ summary: 'Decline booking (owner only)' })
  decline(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.bookings.decline(id, user.id);
  }

  @Post(':id/cancel')
  @UseGuards(BookingRenterGuard)
  @ApiOperation({ summary: 'Cancel booking (renter only)' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.bookings.cancel(id, user.id);
  }

  @Post(':id/complete')
  @UseGuards(BookingParticipantGuard)
  @ApiOperation({ summary: 'Mark booking completion as renter or owner' })
  complete(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CompleteBookingDto,
  ) {
    return this.bookings.completeBooking(id, user.id, dto);
  }

  @Post(':id/issues')
  @UseGuards(BookingParticipantGuard)
  @ApiOperation({ summary: 'Create booking issue report (participant only)' })
  createIssue(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateBookingIssueDto,
  ) {
    return this.bookings.createBookingIssue(id, user.id, dto);
  }

  @Get(':id/issues')
  @UseGuards(BookingParticipantGuard)
  @ApiOperation({ summary: 'List booking issues (participant only)' })
  getIssues(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.bookings.getBookingIssues(id, user.id);
  }
}
