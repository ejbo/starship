-- 群组/频道 Discord 式配置：群简介+图标、频道主题+慢速模式
ALTER TABLE "ChatGroup" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChatGroup" ADD COLUMN     "iconUrl" TEXT;
ALTER TABLE "ChatChannel" ADD COLUMN     "topic" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChatChannel" ADD COLUMN     "slowmodeSec" INTEGER NOT NULL DEFAULT 0;
