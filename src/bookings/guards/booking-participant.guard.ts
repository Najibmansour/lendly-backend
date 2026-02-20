import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtUser } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class BookingParticipantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: JwtUser; params: { id: string } }>();
    const user = request.user;
    const bookingId = request.params?.id;
    if (!bookingId) return false;
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.ownerId !== user.id && booking.renterId !== user.id) {
      throw new ForbiddenException('Only the renter or owner can view this booking');
    }
    request['booking'] = booking;
    return true;
  }
}
