-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "FriendNote" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "remark" TEXT NOT NULL,

    CONSTRAINT "FriendNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FriendNote_ownerUserId_targetUserId_key" ON "FriendNote"("ownerUserId", "targetUserId");

