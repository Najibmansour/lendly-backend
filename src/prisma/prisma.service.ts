import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = getRequiredEnv('DATABASE_URL');
    const maxConnections = Number.parseInt(
      process.env.DATABASE_MAX_CONNECTIONS ?? '5',
      10,
    );
    const adapter = new PrismaPg(
      {
        connectionString: databaseUrl,
        max:
          Number.isFinite(maxConnections) && maxConnections > 0
            ? maxConnections
            : 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      },
      {
        onPoolError: (error) => {
          console.error('Prisma pool error:', error?.message);
        },
      },
    );

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
