import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileType } from './dto/generate-upload-url.dto';

// Allowed extensions per file type (strict whitelist)
const ALLOWED_EXTENSIONS: Record<FileType, Set<string>> = {
  [FileType.IMAGE]: new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']),
  [FileType.VIDEO]: new Set(['mp4', 'webm', 'mov']),
  [FileType.DOCUMENT]: new Set(['pdf']),
};

// Magic byte signatures for file type validation
const MAGIC_BYTES: Record<string, Buffer[]> = {
  jpg: [Buffer.from([0xFF, 0xD8, 0xFF])],
  jpeg: [Buffer.from([0xFF, 0xD8, 0xFF])],
  png: [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  gif: [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  webp: [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF header
  pdf: [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  mp4: [Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])],
  webm: [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])],
  mov: [Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70])],
};

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrlBase: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>('R2_REGION') ?? 'auto';
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') ?? '';
    this.publicUrlBase = this.configService.get<string>('R2_PUBLIC_URL') ?? '';

    if (!accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error(
        'R2 configuration is missing. Please set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME',
      );
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
      // 1. Validate extension against whitelist
      const ext = (extension ?? this.getDefaultExtension(fileType)).toLowerCase();
      if (!ALLOWED_EXTENSIONS[fileType].has(ext)) {
        throw new HttpException(
          `File extension .${ext} not allowed for ${fileType} uploads. Allowed: ${Array.from(ALLOWED_EXTENSIONS[fileType]).join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const finalExt = `.${ext}`;

      // 3. Build the S3 key
      const folderPath = folder ? `${folder}/` : `${fileType}/`;
      const key = `${folderPath}${timestamp}-${randomId}${finalExt}`;

      // 4. Determine content type based on file type (not extension)
      const contentType = this.getContentType(fileType, ext);

      // 5. Create the PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        // Add metadata for security tracking
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'file-type': fileType,
        },
      });

      // 6. Generate presigned URL (expires in 5 minutes)
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300,
      });

      // 7. Build public URL
      const publicUrl = this.publicUrlBase
        ? `${this.publicUrlBase}/${key}`
        : `https://${this.bucketName}.${this.publicUrlBase}/${key}`;
      
      return { signedUrl, publicUrl, key };
    } catch (error: any) {
      const message = error?.message || 'Unknown error generating upload URL';

      if (
        error?.name === 'S3ServiceException' ||
        error?.$metadata?.httpStatusCode === 403
      ) {
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

  /**
   * Validate file magic bytes match extension
   * NOTE: This should be called AFTER upload to verify actual file content
   * Use with presigned URL POST policies or server-side multipart upload
   */
  validateFileMagicBytes(buffer: Buffer, extension: string): boolean {
    const ext = extension.toLowerCase();
    const signatures = MAGIC_BYTES[ext];
    
    if (!signatures) return false;
    
    return signatures.some(sig => buffer.subarray(0, sig.length).equals(sig));
  }

  private getDefaultExtension(fileType: FileType): string {
    switch (fileType) {
      case FileType.IMAGE:
        return 'jpg'; // No dot - will be added by caller
      case FileType.VIDEO:
        return 'mp4';
      case FileType.DOCUMENT:
        return 'pdf';
      default:
        return '';
    }
  }

  private getContentType(fileType: FileType, extension?: string): string {
    // Always return safe MIME types based on FileType enum, never trust extension
    switch (fileType) {
      case FileType.IMAGE:
        return 'image/jpeg'; // Secure default for images
      case FileType.VIDEO:
        return 'video/mp4'; // Secure default for videos
      case FileType.DOCUMENT:
        return 'application/pdf'; // Only allow PDF for documents
      default:
        return 'application/octet-stream';
    }
  }
}
