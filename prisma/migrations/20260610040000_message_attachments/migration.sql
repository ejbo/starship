-- DropIndex
DROP INDEX "Message_fromId_toId_idx";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'text';

-- CreateIndex
CREATE INDEX "Message_fromId_toId_at_idx" ON "Message"("fromId", "toId", "at");

