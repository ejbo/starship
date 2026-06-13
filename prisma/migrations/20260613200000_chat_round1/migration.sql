-- 消息交互：编辑/删除/引用/变更游标
ALTER TABLE "Message" ADD COLUMN "editedAt" TEXT;
ALTER TABLE "Message" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT;
ALTER TABLE "Message" ADD COLUMN "updatedAt" TEXT;
UPDATE "Message" SET "updatedAt" = "at" WHERE "updatedAt" IS NULL;
CREATE INDEX "Message_fromId_toId_updatedAt_idx" ON "Message"("fromId", "toId", "updatedAt");
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupMessage" ADD COLUMN "editedAt" TEXT;
ALTER TABLE "GroupMessage" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GroupMessage" ADD COLUMN "replyToId" TEXT;
ALTER TABLE "GroupMessage" ADD COLUMN "updatedAt" TEXT;
UPDATE "GroupMessage" SET "updatedAt" = "at" WHERE "updatedAt" IS NULL;
CREATE INDEX "GroupMessage_channelId_updatedAt_idx" ON "GroupMessage"("channelId", "updatedAt");
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "GroupMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 表情反应
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "at" TEXT NOT NULL,
    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageReaction_scope_messageId_userId_emoji_key" ON "MessageReaction"("scope", "messageId", "userId", "emoji");
CREATE INDEX "MessageReaction_scope_messageId_idx" ON "MessageReaction"("scope", "messageId");
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- typing + 已读信号
CREATE TABLE "ChatSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "typingAt" TEXT,
    "readAt" TEXT,
    "channelId" TEXT,
    CONSTRAINT "ChatSignal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatSignal_userId_scope_key" ON "ChatSignal"("userId", "scope");
CREATE INDEX "ChatSignal_scope_idx" ON "ChatSignal"("scope");
CREATE INDEX "ChatSignal_channelId_idx" ON "ChatSignal"("channelId");

-- 语音房间在场
CREATE TABLE "VoiceParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TEXT NOT NULL,
    "lastSeenAt" TEXT NOT NULL,
    "micOn" BOOLEAN NOT NULL DEFAULT true,
    "speaking" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "VoiceParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VoiceParticipant_roomId_userId_key" ON "VoiceParticipant"("roomId", "userId");
CREATE INDEX "VoiceParticipant_roomId_idx" ON "VoiceParticipant"("roomId");
