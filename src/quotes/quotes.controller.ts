import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@ApiTags('quotes')
@UseGuards(ThrottlerGuard)
@Controller('v1/quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60 } })
  @ApiOperation({ summary: 'Get a price quote for a listing and date range' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quotes.createQuote(dto);
  }
}
