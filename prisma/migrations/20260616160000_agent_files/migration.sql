-- 本地 agent 工作目录文件镜像（opt-in 同步：连接器上传内容，网页查看/编辑，编辑回写本机）
CREATE TABLE "AgentFile" (
    "id"          TEXT NOT NULL,
    "agentId"     TEXT NOT NULL,
    "path"        TEXT NOT NULL,
    "content"     TEXT NOT NULL DEFAULT '',
    "pendingPush" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt"   TEXT NOT NULL,
    CONSTRAINT "AgentFile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgentFile_agentId_path_key" ON "AgentFile"("agentId", "path");
CREATE INDEX "AgentFile_agentId_idx" ON "AgentFile"("agentId");
