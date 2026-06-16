-- 频道级 Agent 响应范围：限定哪些 agent 在该频道自动响应（null/空=全部）
ALTER TABLE "ChatChannel" ADD COLUMN     "agentScope" JSONB;
