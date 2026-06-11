-- CreateTable
CREATE TABLE "WishlistEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "WishlistEntry_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "WishlistEntry_userId_idx" ON "WishlistEntry"("userId");
-- CreateIndex
CREATE UNIQUE INDEX "WishlistEntry_userId_productId_key" ON "WishlistEntry"("userId", "productId");
-- AddForeignKey
ALTER TABLE "WishlistEntry" ADD CONSTRAINT "WishlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WishlistEntry" ADD CONSTRAINT "WishlistEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
