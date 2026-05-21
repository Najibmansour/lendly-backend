import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { GenerateUploadUrlDto, FileType } from './dto/generate-upload-url.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Upload')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('v1/api/upload-url')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate presigned URL for direct cloud upload',
    description:
      'Returns a signed URL for uploading files directly to R2 storage, plus a public URL for storing in the database',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URLs generated successfully',
    schema: {
      example: {
        signedUrl: 'https://your-bucket.r2.cloudflarestorage.com/...',
        publicUrl: 'https://cdn.yourdomain.com/image/123456.jpg',
        key: 'image/123456-abc123.jpg',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateUploadUrl(@Body() dto: GenerateUploadUrlDto) {
    const result = await this.uploadService.generateUploadUrl(
      dto.fileType,
      dto.extension,
      dto.folder,
    );
   
    return result;
  }
}
