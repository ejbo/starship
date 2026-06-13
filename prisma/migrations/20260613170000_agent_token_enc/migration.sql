-- 令牌信封密文：owner 随时取回启动/重启命令，免重置令牌
ALTER TABLE "User" ADD COLUMN "agentTokenEnc" TEXT;
