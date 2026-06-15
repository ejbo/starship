-- 好友申请/接受时间：用于「好友申请」倒序与「最近添加」倒序展示
ALTER TABLE "FriendEdge" ADD COLUMN     "createdAt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FriendEdge" ADD COLUMN     "acceptedAt" TEXT NOT NULL DEFAULT '';
