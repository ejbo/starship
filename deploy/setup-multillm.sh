#!/usr/bin/env bash
# 在实例上一键接入 multillm：探测公网 IP → 配置平台造物 → pm2 起服务。
# 用法（在 starship 仓库根目录）：bash deploy/setup-multillm.sh
# 可覆盖：PUBLIC_IP / MULTILLM_PORT(4000) / STARPORT_PORT(3000) /
#         MULTILLM_CLIENT_ID(app_multillm) / MULTILLM_CLIENT_SECRET(sk_app_multillm_demo)
set -euo pipefail
cd "$(dirname "$0")/.."   # 仓库根

IP="${PUBLIC_IP:-$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]')}"
PORT="${MULTILLM_PORT:-4000}"
SP_PORT="${STARPORT_PORT:-3000}"
CLIENT_ID="${MULTILLM_CLIENT_ID:-app_multillm}"
CLIENT_SECRET="${MULTILLM_CLIENT_SECRET:-sk_app_multillm_demo}"

STARPORT_BASE="http://$IP:$SP_PORT"
SELF_BASE="http://$IP:$PORT"

echo "==> 公网 IP: $IP"
echo "    平台:    $STARPORT_BASE"
echo "    multillm: $SELF_BASE"

echo "==> 配置平台里的 multillm 造物（newtab + 凭证 + entryUrl）"
MULTILLM_ENTRY_URL="$SELF_BASE" \
MULTILLM_CLIENT_ID="$CLIENT_ID" \
MULTILLM_CLIENT_SECRET="$CLIENT_SECRET" \
  node deploy/configure-multillm.mjs

echo "==> 启动 multillm（pm2, :$PORT）"
pm2 delete multillm >/dev/null 2>&1 || true
PORT="$PORT" \
SELF_BASE="$SELF_BASE" \
STARPORT_BASE="$STARPORT_BASE" \
CLIENT_ID="$CLIENT_ID" \
CLIENT_SECRET="$CLIENT_SECRET" \
  pm2 start deploy/multillm/server.mjs --name multillm --update-env
pm2 save

echo
echo "==> 完成。还差一步：在 Lightsail 防火墙放行 TCP $PORT（source Anywhere）。"
echo "    然后在平台里打开 multillm-chat → 启动，会新标签页打开 $SELF_BASE 并用星港账号登录。"
