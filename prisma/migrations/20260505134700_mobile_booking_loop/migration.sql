-- AlterEnum
ALTER TYPE "BookingStatus" RENAME VALUE 'ACCEPTED' TO 'CONFIRMED';

-- AlterTable
ALTER TABLE "bookings"
ADD COLUMN "ownerConfirmedAt" TIMESTAMP(3),
ADD COLUMN "renterConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "booking_issues" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_issues_bookingId_createdAt_idx" ON "booking_issues"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "booking_issues_authorId_idx" ON "booking_issues"("authorId");

-- AddForeignKey
ALTER TABLE "booking_issues" ADD CONSTRAINT "booking_issues_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_issues" ADD CONSTRAINT "booking_issues_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
