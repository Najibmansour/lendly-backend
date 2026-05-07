-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'HOLD', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "depositAmount" DECIMAL(65,30),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';
