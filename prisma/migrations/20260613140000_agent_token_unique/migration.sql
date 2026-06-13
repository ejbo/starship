-- 令牌哈希唯一索引：鉴权 findUnique 命中，避免全表扫描
CREATE UNIQUE INDEX "User_agentTokenHash_key" ON "User"("agentTokenHash");
