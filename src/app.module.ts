import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { EmailModule } from './email/email.module';
import { AdminAuditModule } from './admin-audit/admin-audit.module';
import { CleanupModule } from './cleanup/cleanup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (config) => {
        if (!config.DATABASE_URL) {
          throw new Error(
            'Missing required environment variable: DATABASE_URL',
          );
        }
        return config;
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 50,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    PricingModule,
    AuthModule,
    UsersModule,
    TosModule,
    LegalModule,
    EmailModule,
    AdminAuditModule,
    CleanupModule,
    CategoriesModule,
    TagsModule,
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
