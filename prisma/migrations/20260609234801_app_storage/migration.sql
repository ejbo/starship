-- CreateTable
CREATE TABLE "AppStorage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppStorage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppStorage_userId_productSlug_key_key" ON "AppStorage"("userId", "productSlug", "key");

-- AddForeignKey
ALTER TABLE "AppStorage" ADD CONSTRAINT "AppStorage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
