-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activityAt" TEXT,
ADD COLUMN     "currentActivity" TEXT,
ADD COLUMN     "lastSeenAt" TEXT,
ADD COLUMN     "presenceDetail" TEXT,
ADD COLUMN     "presenceKind" TEXT NOT NULL DEFAULT 'offline';

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "at" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_fromId_toId_idx" ON "Message"("fromId", "toId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
