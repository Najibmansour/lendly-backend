import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LegalService } from './legal.service';

@ApiTags('legal')
@Controller('v1/legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('privacy')
  @ApiOperation({ summary: 'Get the privacy policy' })
  getPrivacy() {
    return this.legalService.getDocument('privacy');
  }

  @Get('terms')
  @ApiOperation({ summary: 'Get the terms of service' })
  getTerms() {
    return this.legalService.getDocument('terms');
  }

  @Get('retention')
  @ApiOperation({ summary: 'Get the data retention policy' })
  getRetention() {
    return this.legalService.getDocument('retention');
  }

  @Get('versions')
  @ApiOperation({ summary: 'Get available legal document versions' })
  getVersions() {
    return this.legalService.getVersions();
  }
}
