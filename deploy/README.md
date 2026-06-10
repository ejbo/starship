# 星港 StarPort · AWS Lightsail 部署指南

> 目标：把星港部到一台 Lightsail 实例上，用 `git pull + pnpm` 跑起来；数据库复用你现有的 ai4news RDS（单开一个 `starport` database）。

---

## 〇、整体形态

```
浏览器 ──HTTPS──> Caddy(实例上,自动证书) ──HTTP──> Next.js (pnpm start, :3000)
                                                      │
                                                      └── Prisma ──> ai4news RDS 上的 starport 库
```

---

## 一、先在 RDS 上建库（一次性）

用任意能连到 ai4news RDS 的机器（本地或实例）执行：

```bash
# 用你 ai4news RDS 的 master 账号连上去（database 先连默认的 ai4news 或 postgres）
psql "postgresql://dbmasteruser:<密码>@<你的rds-host>:5432/ai4news?sslmode=no-verify" \
  -c "CREATE DATABASE starport;"
```

> 为什么单开 database 而不是 schema：和本地 `starport_dev` 完全一致（public schema），迁移零意外，也不跟 multillm 的 `multillm_chat` schema 混在一起。

---

## 二、把代码放到 GitHub（一次性）

仓库现在只有本地提交、没有远程。先推到一个**私有** GitHub 仓库（别公开，里面虽不含 .env，但是你的产品代码）：

```bash
# 本地，在 social-plat 目录
gh repo create starport --private --source=. --remote=origin --push
# 或手动：git remote add origin git@github.com:你/starport.git && git push -u origin main
```

---

## 三、开 Lightsail 实例

1. Lightsail 控制台 → Create instance → **Linux/Unix → Ubuntu 22.04**。
2. 规格选 **≥ 2GB 内存**（`next build` 吃内存，1GB 容易 OOM）。
3. 创建后 → Networking → 开放 **80 与 443**（HTTP/HTTPS）入站。
4. 给它一个 **Static IP**，并把你的域名 A 记录指向这个 IP。

---

## 四、装环境（实例上，一次性）

```bash
# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
# pnpm + pm2
sudo npm i -g pnpm pm2
# Caddy（自动 HTTPS 反代）
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

---

## 五、拉代码、配环境、起服务

```bash
git clone <你的GitHub仓库地址> starport && cd starport

# 配环境变量
cp deploy/.env.production.example .env
# 编辑 .env：
#   DATABASE_URL = ai4news RDS，但 database 换成 starport，带 ?sslmode=no-verify
#   IRON_SESSION_PASSWORD / STARPORT_SECRET = 各跑一次 openssl rand -hex 32 填进去（生产用全新值）
nano .env

pnpm install --frozen-lockfile
pnpm prisma migrate deploy        # 在 RDS 的 starport 库建好所有表
pnpm build
pm2 start pnpm --name starport -- start   # 启动，监听 :3000
pm2 save && pm2 startup            # 开机自启（按提示执行它打印的那行 sudo 命令）
```

### （可选）灌一点演示数据
生产一般不灌种子。要做 demo 可临时：`pnpm db:reset`（会清库重灌演示数据 + me/starport123 账号）。**正式上线前清掉演示数据、自己注册账号。**

---

## 六、配 Caddy（HTTPS 反代）

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile     # 把域名换成你的
sudo systemctl restart caddy
```

访问 `https://你的域名` 即可。Caddy 自动签发并续期证书。

---

## 七、以后更新（每次发新版）

```bash
cd ~/starport && bash deploy/deploy.sh
# 内部：git pull → pnpm install → migrate deploy → build → pm2 restart
```

---

## 八、multillm 接入应用（如果也要上线）

multillm-starport 是独立小服务（`node server.mjs`，零依赖）。同机部署：

```bash
git clone <multillm-starport仓库> multillm && cd multillm
pm2 start server.mjs --name multillm -- \
  ;  # 环境变量通过 pm2 设：
pm2 set ...  # 或写个 ecosystem 文件，关键变量：
#   STARPORT_BASE=https://starport.你的域名.com
#   SELF_BASE=https://multillm.你的域名.com
#   CLIENT_ID=app_multillm   CLIENT_SECRET=<在开发者中心重置后的密钥>   PORT=4000
```
Caddyfile 里已给 `multillm.你的域名.com` 配好反代到 4000。
然后在星港「开发者中心 → MultiLLM」把**入口 URL** 改成 `https://multillm.你的域名.com`。

---

## 九、上线前安全清单（重要）

- [ ] `.env` 不进 git（已 gitignore）；生产 `IRON_SESSION_PASSWORD`/`STARPORT_SECRET` 用全新随机值，不要用开发值。
- [ ] RDS 安全组：只允许 Lightsail 实例 IP 访问 5432，别对公网开放。
- [ ] 实例出网：能访问 api.anthropic.com / api.openai.com（Gateway 调模型）。
- [ ] **OAuth 回调白名单**：当前授权页对 redirect_uri 未做校验，存在开放重定向风险。上线前建议加每应用回调白名单——这块我可以帮你改（让我做即可）。
- [ ] 头像/附件目前以 dataURL 存库，量大撑库；要规模化再迁 S3+CloudFront。
- [ ] 清掉演示数据、删掉 me/starport123 这类演示账号。

---

## 速查
- 看日志：`pm2 logs starport`
- 重启：`pm2 restart starport`
- 迁移状态：`pnpm prisma migrate status`
- 数据库放在 ai4news RDS 的 `starport` 库（public schema）。
