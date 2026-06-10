import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { writeFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.use(helmet());

  // Configure CORS from environment: ALLOWED_ORIGINS and MOBILE_ALLOWED_ORIGINS
  const rawAllowed = process.env.ALLOWED_ORIGINS ?? '';
  const rawMobile = process.env.MOBILE_ALLOWED_ORIGINS ?? '';
  const allowed = rawAllowed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const mobile = rawMobile
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([...allowed, ...mobile]);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g., server-to-server, curl) with no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.size === 0)
        return callback(new Error('CORS not configured'), false);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('CORS origin denied'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Lendly API')
    .setDescription('Lendly backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api', app, document);
  }

  const authService = app.get(AuthService);
  try {
    await authService.cleanupExpiredSessions();
  } catch (error) {
    console.warn('Failed to cleanup expired sessions on startup:', error);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
