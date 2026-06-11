#!/usr/bin/env bash
# 一键接入【完整版 multillm】：拉完整 app 仓库 → 部署(pm2 :4000) → 把平台造物指过去。
# 用法（在 starship 仓库根目录）：bash deploy/setup-multillm.sh
# 可覆盖：PUBLIC_IP / MULTILLM_PORT(4000) / STARPORT_PORT(3000) /
#         MULTILLM_REPO / MULTILLM_DIR / MULTILLM_CLIENT_ID / MULTILLM_CLIENT_SECRET
set -euo pipefail
cd "$(dirname "$0")/.."   # starship 仓库根

IP="${PUBLIC_IP:-$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]')}"
PORT="${MULTILLM_PORT:-4000}"
SP_PORT="${STARPORT_PORT:-3000}"
CLIENT_ID="${MULTILLM_CLIENT_ID:-app_multillm}"
CLIENT_SECRET="${MULTILLM_CLIENT_SECRET:-sk_app_multillm_demo}"
REPO="${MULTILLM_REPO:-git@github.com:ejbo/multillm-starport.git}"
DIR="${MULTILLM_DIR:-$HOME/projects/multillm-starport}"

SELF_BASE="http://$IP:$PORT"
echo "==> 公网 IP: $IP    multillm: $SELF_BASE"

# 1) 拉取/更新完整 multillm 仓库
if [ -d "$DIR/.git" ]; then
  echo "==> 更新完整 multillm 仓库：$DIR"
  git -C "$DIR" pull --ff-only
else
  echo "==> 克隆完整 multillm 仓库到：$DIR"
  git clone "$REPO" "$DIR"
fi

# 2) 部署完整 app（它自带的 up.sh：写星港地址 → 装 → 构建 → pm2 起 :PORT）
echo "==> 部署完整 multillm（端口 $PORT）"
PUBLIC_IP="$IP" PORT="$PORT" STARPORT_PORT="$SP_PORT" bash "$DIR/deploy/up.sh"

# 3) 把平台造物 entryUrl 指向完整 app（client 密钥 hash 同步）
echo "==> 把平台造物指向 $SELF_BASE"
MULTILLM_ENTRY_URL="$SELF_BASE" \
MULTILLM_CLIENT_ID="$CLIENT_ID" \
MULTILLM_CLIENT_SECRET="$CLIENT_SECRET" \
  node deploy/configure-multillm.mjs

echo
echo "==> 完成。还差一步：Lightsail 防火墙放行 TCP $PORT（source Anywhere）。"
echo "    然后平台里打开 multillm-chat → 启动 → 新标签页 $SELF_BASE → 星港账号登录 → 即可使用。"
echo "    想要真实模型回复：进完整 multillm 的 /admin 或 Settings 配模型 key。"
