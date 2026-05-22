import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeService } from './home.service';
import { HomeQueryDto } from './dto/home-query.dto';

@ApiTags('home')
@Controller('v1/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiOperation({ summary: 'Get homepage data (categories, banners, sections)' })
  async getHome(@Query() query: HomeQueryDto) {
    return this.homeService.getHome(query);
  }
}
