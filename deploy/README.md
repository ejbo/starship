# 星港 StarPort · AWS Lightsail 部署指南（自测·最省事版）

> 目标：clone 下来 → `pnpm install && pnpm build && pnpm start` 直接能用。
> 数据库复用你现有的 **Lightsail 托管 Postgres**，库还是 `postgres`，星港单开一个 **`starport` schema** 跟 skills-community 隔离。
> 建 schema + 迁移**全自动**（`pnpm start` 启动时自举），你什么都不用手动做。

---

## 〇、整体形态

```
浏览器 ──HTTPS──> Caddy(实例上,自动证书) ──HTTP──> Next.js (pnpm start, :3000)
                                                      │
                                                      └── Prisma ──> Lightsail 库 postgres 的 starport schema
```

数据库连接已经写进仓库里的 `.env.production`（自测方便，含真实密钥——**仓库务必私有**）。
schema/迁移由 `scripts/bootstrap-db.mjs` 在每次 `pnpm start` 时自动跑（幂等，无待迁移时秒过）。

---

## 一、数据库：不用手动做任何事

- 库 = `postgres`，schema = `starport`，已在 `.env.production` 的 `DATABASE_URL` 里配好。
- `sslmode=no-verify`（Lightsail 证书 node 默认不信任，必须用这个，`require` 会报 self-signed）。
- 首次 `pnpm start` 会自动 `CREATE SCHEMA IF NOT EXISTS starport` + 应用全部迁移建表。
- 已验证：18 张表落在 `starport` schema，`skills_community` 不受影响。

> 想换 schema 名？改 `.env.production` 里 `DATABASE_URL` 末尾的 `&schema=xxx` 即可，启动会自动建。

---

## 二、把代码放到 GitHub（一次性）

仓库含 `.env.production`（真实密钥），**必须私有**：

```bash
gh repo create starport --private --source=. --remote=origin --push
# 或：git remote add origin git@github.com:你/starport.git && git push -u origin main
```

---

## 三、开 Lightsail 实例

1. Lightsail 控制台 → Create instance → **Ubuntu 22.04**。
2. 规格 **≥ 2GB 内存**（`next build` 吃内存，1GB 易 OOM）。
3. Networking → 开放 **80 / 443** 入站；给一个 **Static IP**，域名 A 记录指过去。
4. 确保实例能连到你的 Lightsail 数据库：同区域走内网即可；若数据库开了 **public mode**，公网也能连。

---

## 四、装环境（实例上，一次性）

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm i -g pnpm pm2
# Caddy（自动 HTTPS 反代）
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

---

## 五、拉代码、起服务（就这几行）

```bash
git clone <你的GitHub仓库地址> starport && cd starport
pnpm install --frozen-lockfile
pnpm build
pm2 start pnpm --name starport -- start    # start 会先自举数据库(建 schema+迁移)，再 next start，监听 :3000
pm2 save && pm2 startup                     # 开机自启（按提示执行它打印的那行 sudo 命令）
```

> 不用 cp/编辑 `.env`——`.env.production` 已在仓库里、值已填好。
> 想手动触发建库迁移：`pnpm db:bootstrap`。

### （可选）灌演示数据
`pnpm db:reset` 会清空 starport schema 并重灌演示数据 + me/starport123 账号。正式给人看前清掉。

---

## 六、配 Caddy（HTTPS 反代）

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile     # 把域名换成你的
sudo systemctl restart caddy
```

访问 `https://你的域名` 即可，证书自动签发续期。

---

## 七、以后更新（每次发新版）

```bash
cd ~/starport && bash deploy/deploy.sh
# 内部：git pull → pnpm install → db:bootstrap(建schema+迁移) → build → pm2 restart
```

---

## 八、multillm 接入应用（让平台能"启动"它）

multillm 是零依赖单文件服务，已随仓库带在 `deploy/multillm/server.mjs`。
一条脚本搞定：探测公网 IP → 把平台里的 `multillm-chat` 造物配成 newtab+凭证+公网 entryUrl → pm2 起服务。

```bash
cd ~/projects/starship
bash deploy/setup-multillm.sh
```

然后**去 Lightsail 防火墙放行 TCP 4000**（source Anywhere），就能用了：
平台里打开 multillm-chat → **启动** → 新标签页打开 `http://<你的IP>:4000` → 用星港账号登录（me/starport123）→ 并排多模型对话。

要点：
- multillm 走 OAuth（authorize/token）+ 平台 Gateway（`/api/v1/ai/chat`），用**登录用户在平台配的 API Key**，应用本身不碰明文 key。
- 想要真实模型回复：用 me 登录平台 → **API 配置中心**填真实 Anthropic/OpenAI key（seed 灌的是假 key，会被上游 401）。
- 域名/HTTPS 版：脚本默认用 `http://IP:端口`。等你上了 Caddy+域名，把 `STARPORT_PORT`/`MULTILLM_PORT` 换成子域并改 `Caddyfile`（`multillm.你的域名` 已配好反代 4000），用 `PUBLIC_IP=multillm.你的域名.com` 之类覆盖即可。
- 改 client 密钥：`MULTILLM_CLIENT_SECRET=新值 bash deploy/setup-multillm.sh`（会同步更新平台里的 hash 和 multillm 自身）。

---

## 九、自测须知（安全已按你要求放宽）

按你要求以"自测最省事"为先，做了这些取舍：
- `.env.production`（含数据库密码 + 会话/加密密钥）**直接进了仓库** → 仓库必须私有，别公开。
- `sslmode=no-verify`：加密但不校验数据库证书。自测够用；要严格校验需装 Lightsail CA。
- OAuth 回调 `redirect_uri` 暂未做白名单（开放重定向风险）。要上线给外人用时再让我补。
- 头像/附件以 dataURL 存库，量大撑库；规模化再迁 S3。

---

## 速查
- 看日志：`pm2 logs starport`
- 重启：`pm2 restart starport`
- 手动建库迁移：`pnpm db:bootstrap`
- 迁移状态：`pnpm prisma migrate status`
- 数据库：Lightsail 库 `postgres` 的 `starport` schema。
