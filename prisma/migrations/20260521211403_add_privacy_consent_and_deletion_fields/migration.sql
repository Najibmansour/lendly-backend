-- AlterTable
ALTER TABLE "users" ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "consentIp" TEXT,
ADD COLUMN     "consentUserAgent" TEXT,
ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
