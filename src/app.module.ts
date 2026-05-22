import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { ListingsModule } from './listings/listings.module';
import { HomeModule } from './home/home.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuotesModule } from './quotes/quotes.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { TosModule } from './tos/tos.module';
import { LegalModule } from './legal/legal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          limit: 50,
          ttl: 60,
        },
      ],
    }),
    PrismaModule,
    PricingModule,
    AuthModule,
    UsersModule,
    TosModule,
    LegalModule,
    ListingsModule,
    HomeModule,
    QuotesModule,
    BookingsModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
