-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN     "usageMinutes" INTEGER NOT NULL DEFAULT 0;
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "capsuleUrl" TEXT,
ADD COLUMN     "screenshotUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "trailerUrl" TEXT;
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;
