-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "acceptedTosId" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "terms_of_service" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresReacceptance" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_of_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tos_agreements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tosVersionId" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tos_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "terms_of_service_version_locale_idx" ON "terms_of_service"("version", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "terms_of_service_version_locale_key" ON "terms_of_service"("version", "locale");

-- CreateIndex
CREATE INDEX "tos_agreements_userId_idx" ON "tos_agreements"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_acceptedTosId_fkey" FOREIGN KEY ("acceptedTosId") REFERENCES "terms_of_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_of_service" ADD CONSTRAINT "terms_of_service_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tos_agreements" ADD CONSTRAINT "tos_agreements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tos_agreements" ADD CONSTRAINT "tos_agreements_tosVersionId_fkey" FOREIGN KEY ("tosVersionId") REFERENCES "terms_of_service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
