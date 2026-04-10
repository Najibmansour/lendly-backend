/*
  Warnings:

  - You are about to drop the column `condition` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `dailyRate` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `hourlyRate` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `lat` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyRate` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyRate` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - Added the required column `pricePerDay` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "listings" DROP COLUMN "condition",
DROP COLUMN "dailyRate",
DROP COLUMN "hourlyRate",
DROP COLUMN "images",
DROP COLUMN "lat",
DROP COLUMN "lng",
DROP COLUMN "monthlyRate",
DROP COLUMN "weeklyRate",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "pricePerDay" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "name",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;
