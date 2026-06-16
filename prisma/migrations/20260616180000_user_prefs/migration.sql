-- 用户偏好：新建 agent 的统一默认配置 + 自定义"正在回答"文案库
ALTER TABLE "User" ADD COLUMN     "prefs" JSONB;
