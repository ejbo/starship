-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('app', 'model', 'agent', 'skill', 'tutorial', 'video');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarHue" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "signature" TEXT NOT NULL DEFAULT '',
    "tokenBalance" TEXT NOT NULL DEFAULT '0',
    "badges" JSONB NOT NULL DEFAULT '[]',
    "showcase" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendEdge" (
    "id" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "bId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',

    CONSTRAINT "FriendEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT[],
    "hueA" INTEGER NOT NULL,
    "hueB" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "tags" TEXT[],
    "ratingScore" DOUBLE PRECISION NOT NULL,
    "ratingCount" INTEGER NOT NULL,
    "histogram" INTEGER[],
    "acquisitions" INTEGER NOT NULL,
    "developer" TEXT NOT NULL,
    "version" TEXT,
    "entryUrl" TEXT,
    "priceCredits" INTEGER,
    "capabilities" TEXT[],
    "releasedAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "avatarHue" INTEGER NOT NULL,
    "isAgent" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL,
    "usageHours" INTEGER NOT NULL,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "body" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "acquiredAt" TEXT NOT NULL,
    "lastUsedAt" TEXT,
    "usageHours" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LibraryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorHue" INTEGER NOT NULL,
    "actorIsAgent" BOOLEAN NOT NULL DEFAULT false,
    "verb" TEXT NOT NULL,
    "productSlug" TEXT,
    "detail" TEXT,
    "at" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "FriendEdge_aId_bId_key" ON "FriendEdge"("aId", "bId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryEntry_userId_productId_key" ON "LibraryEntry"("userId", "productId");

-- AddForeignKey
ALTER TABLE "FriendEdge" ADD CONSTRAINT "FriendEdge_aId_fkey" FOREIGN KEY ("aId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendEdge" ADD CONSTRAINT "FriendEdge_bId_fkey" FOREIGN KEY ("bId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
