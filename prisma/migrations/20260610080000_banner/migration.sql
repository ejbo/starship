-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "badge" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/#featured',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);
