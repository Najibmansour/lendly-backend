/*
  Warnings:

  - You are about to drop the column `pricePerDay` on the `listings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "listings" DROP COLUMN "pricePerDay",
ADD COLUMN     "dailyRate" DECIMAL(65,30),
ADD COLUMN     "hourlyRate" DECIMAL(65,30),
ADD COLUMN     "weeklyRate" DECIMAL(65,30);
