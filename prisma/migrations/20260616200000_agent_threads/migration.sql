-- agent 私聊多会话：会话线程表 + 消息/任务的线程归属
CREATE TABLE "AgentThread" (
    "id"        TEXT NOT NULL,
    "ownerId"   TEXT NOT NULL,
    "agentId"   TEXT NOT NULL,
    "title"     TEXT NOT NULL DEFAULT '',
    "createdAt" TEXT NOT NULL,
    "lastAt"    TEXT NOT NULL,
    CONSTRAINT "AgentThread_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AgentThread_ownerId_agentId_lastAt_idx" ON "AgentThread"("ownerId", "agentId", "lastAt");

ALTER TABLE "Message" ADD COLUMN "threadId" TEXT;
CREATE INDEX "Message_threadId_at_idx" ON "Message"("threadId", "at");

ALTER TABLE "AgentTask" ADD COLUMN "threadId" TEXT;
