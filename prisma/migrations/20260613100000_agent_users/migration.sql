-- Agent 虚拟用户字段
ALTER TABLE "User" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'human';
ALTER TABLE "User" ADD COLUMN "agentOwnerId" TEXT;
ALTER TABLE "User" ADD COLUMN "agentKind" TEXT;
ALTER TABLE "User" ADD COLUMN "agentPersona" TEXT;
ALTER TABLE "User" ADD COLUMN "agentTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "agentLastPollAt" TEXT;

-- Agent 收件队列
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fromHandle" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "groupId" TEXT,
    "groupName" TEXT,
    "channelId" TEXT,
    "channelName" TEXT,
    "hops" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentTask_agentId_status_createdAt_idx" ON "AgentTask"("agentId", "status", "createdAt");
