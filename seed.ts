import { PrismaClient, UserRole } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcrypt";
import crypto from "crypto";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing required environment variable: DATABASE_URL or DIRECT_URL');
}

const pool = new Pool({
  connectionString,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
});

const adminPassword = getRequiredEnv('ADMIN_PASSWORD');
if (adminPassword.length < 16) {
  throw new Error('ADMIN_PASSWORD must be at least 16 characters for security');
}

function fileChecksum(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function main() {
  // ======================================================
  // 1. Read Terms of Service file
  // ======================================================

  const tosPath =
  process.env.TOS_PATH ||
  path.resolve(__dirname, "./terms_of_service.md");

  
  if (!fs.existsSync(tosPath)) {
    throw new Error(`TOS file not found at ${tosPath}`);
  }

  const tosContent = fs.readFileSync(tosPath, "utf-8");
  const checksum = fileChecksum(tosContent);

  // ======================================================
  // 2. Create Admin user FIRST (needed for createdById)
  // ======================================================

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin_lendly_xDqo",
    },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email: "admin_lendly_xDqo",
      passwordHash: hashedPassword,
      firstName: "Admin",
      lastName: "Lendly",
      role: UserRole.ADMIN,
    },
  });

  console.log("✅ Admin ready:", admin.email);

  // ======================================================
  // 3. Create Terms of Service entry
  // ======================================================

  const tos = await prisma.termsOfService.upsert({
    where: {
      version_locale: {
        version: 1,
        locale: "en",
      },
    },
    update: {
      filePath: tosPath,
      checksum,
      isActive: true,
    },
    create: {
      version: 1,
      locale: "en",
      filePath: tosPath,
      checksum,
      isActive: true,
      requiresReacceptance: false,
      createdById: admin.id,
    },
  });

  console.log("📄 TOS created version:", tos.version);

  // ======================================================
  // 4. (Optional but recommended) create admin agreement
  // ======================================================

  await prisma.tosAgreement.upsert({
    where: {
      id: `${admin.id}-tos-v1`,
    },
    update: {},
    create: {
      id: `${admin.id}-tos-v1`,
      userId: admin.id,
      tosVersionId: tos.id,
      ipAddress: "127.0.0.1",
      userAgent: "seed-script",
    },
  });

  console.log("📜 Admin TOS agreement recorded");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });