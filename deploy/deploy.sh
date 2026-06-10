#!/usr/bin/env bash
# 星港更新部署脚本：拉代码 → 装依赖 → 迁移 → 构建 → 重启
# 用法：在实例的项目目录里执行  bash deploy/deploy.sh
set -euo pipefail

echo "==> 拉取最新代码"
git pull --ff-only

echo "==> 安装依赖"
pnpm install --frozen-lockfile

echo "==> 确保 schema 存在并应用迁移（建 starport schema + migrate deploy，幂等）"
pnpm db:bootstrap

echo "==> 构建"
pnpm build

echo "==> 重启进程（PM2）"
if pm2 describe starport >/dev/null 2>&1; then
  pm2 restart starport --update-env
else
  pm2 start pnpm --name starport -- start
fi
pm2 save

echo "==> 完成。pm2 logs starport 查看日志。"
