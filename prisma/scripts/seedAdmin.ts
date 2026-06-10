import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (datasourceUrl) {
  process.env.DATABASE_URL = datasourceUrl;
}

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@lendly.app';
  const password = 'Admin12345!';

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Admin already exists');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  console.log('Admin created successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

