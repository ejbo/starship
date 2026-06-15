-- Agent 可调设置（provider/model/上下文条数/链深/限速/各类开关）
ALTER TABLE "User" ADD COLUMN     "agentSettings" JSONB;
