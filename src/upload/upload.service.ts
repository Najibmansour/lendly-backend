import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileType } from './dto/generate-upload-url.dto';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrlBase: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('R2_REGION') ?? 'auto';
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') ?? '';
    this.publicUrlBase = this.configService.get<string>('R2_PUBLIC_URL') ?? '';

    if (!accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error('R2 configuration is missing. Please set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      forcePathStyle: true, // Required for R2/S3-compatible storage
    });
  }

  async generateUploadUrl(
    fileType: FileType,
    extension?: string,
    folder?: string,
  ): Promise<{ signedUrl: string; publicUrl: string; key: string }> {
    try {
      console.log(`Generating upload URL for fileType: ${fileType}, extension: ${extension}, folder: ${folder}`);
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const ext = extension ? `.${extension}` : this.getDefaultExtension(fileType);
      
      // Build the S3 key
      const folderPath = folder ? `${folder}/` : `${fileType}/`;
      const key = `${folderPath}${timestamp}-${randomId}${ext}`;

      // Determine content type based on file type
      const contentType = this.getContentType(fileType, extension);

      // Create the PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      // Generate presigned URL (expires in 5 minutes)
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300,
      });

      // Build public URL
      const publicUrl = this.publicUrlBase 
        ? `${this.publicUrlBase}/${key}` 
        : `https://${this.bucketName}.${this.publicUrlBase}/${key}`;
      console.log(signedUrl, publicUrl, key);
      return { signedUrl, publicUrl, key };
    } catch (error: any) {
      const message = error?.message || 'Unknown error generating upload URL';

      if (error?.name === 'S3ServiceException' || error?.$metadata?.httpStatusCode === 403) {
        throw new HttpException(
          'Failed to generate upload URL: access denied by R2. Check R2 credentials, permissions, and endpoint settings.',
          HttpStatus.FORBIDDEN,
        );
      }

      throw new HttpException(
        `Failed to generate upload URL: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getDefaultExtension(fileType: FileType): string {
    switch (fileType) {
      case FileType.IMAGE:
        return '.jpg';
      case FileType.VIDEO:
        return '.mp4';
      case FileType.DOCUMENT:
        return '.pdf';
      default:
        return '';
    }
  }

  private getContentType(fileType: FileType, extension?: string): string {
    const ext = extension?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    if (ext && mimeTypes[ext]) {
      return mimeTypes[ext];
    }

    // Default based on file type
    switch (fileType) {
      case FileType.IMAGE:
        return 'image/jpeg';
      case FileType.VIDEO:
        return 'video/mp4';
      case FileType.DOCUMENT:
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}