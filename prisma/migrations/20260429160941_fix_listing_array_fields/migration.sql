/*
  Warnings:

  - Added the required column `address` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latitude` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `listings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "tags" TEXT[],
ALTER COLUMN "city" DROP NOT NULL;
