-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "launchMode" TEXT NOT NULL DEFAULT 'embedded';

-- CreateTable
CREATE TABLE "GatewayConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "GatewayConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GatewayConsent_userId_productId_key" ON "GatewayConsent"("userId", "productId");

