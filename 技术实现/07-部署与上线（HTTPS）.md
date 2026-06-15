# 07 · 部署与上线（HTTPS）

> 难度 ⭐⭐
> 这篇讲：应用是怎么部署到云服务器上的、为什么 `http://IP:3000` 能打开但 HTTPS 打不开、
> HTTPS 是怎么搭起来的、以及怎么把「让大家登陆 HTTPS 地址」这件事做对。
> 假设你对「端口」「防火墙」「反向代理」「证书」这些词是模糊的，每个都用大白话解释。

---

## 1. 部署形态（一句话先建立全景）

星港跑在 **AWS Lightsail**（亚马逊的轻量云服务器，相当于一台租来的 Linux 电脑）上：

```
浏览器 ──HTTPS:443──> Caddy（服务器上的反向代理，自动管证书）──http:3000──> Next.js 应用（pnpm start）
                                                                              │
                                                                              └── Prisma ──> Lightsail 托管 Postgres（starport schema）
```

- 应用本体是 `pnpm start` 起的 Next.js 进程，**监听 3000 端口**，用 **PM2**（进程守护工具，崩了自动拉起、开机自启）托管，名字叫 `starport`。
- 更新部署一条命令：服务器上 `cd ~/projects/starship && bash deploy/deploy.sh`（拉代码 → 装依赖 → 跑数据库迁移 → 构建 → PM2 重启；构建在重启前完成，失败则旧进程继续跑，**不停机**）。
- 公网 IP：`44.226.3.135`（务必是 **静态 IP**，见第 6 节）。

> 名词：**端口（port）** = 一台服务器上不同服务的「门牌号」。同一个 IP，3000 号门是应用、80 号门是 HTTP、443 号门是 HTTPS。

---

## 2. 为什么 `http://IP:3000` 能开，HTTPS 却打不开？

这是上线时最容易卡住的地方，讲清楚三件事：

**① 应用只在 3000 端口。** 所以 `http://44.226.3.135:3000` 直接能开——浏览器走 3000 号门，门是开的。

**② 但 HTTPS 默认走 443 端口**（浏览器地址栏打 `https://xxx` 不写端口时，默认连 443）。我们的应用不在 443，得有个东西在 443 接住请求、加上 HTTPS、再转给 3000——这就是 **Caddy 反向代理**（见第 3 节）。

**③ 真正的拦路虎是「Lightsail 防火墙」。** Lightsail 在 AWS 控制台层面有一道**网络防火墙**（叫 IPv4 Firewall），它决定「外面的人能敲这台服务器的哪几号门」。默认通常只放行了 SSH（22）和我们额外开的 3000。**80 和 443 如果没在这里放行，外部请求根本到不了服务器**——哪怕服务器内部 Caddy 已经在 443 监听、证书也签好了，也没用。

> 怎么判断是不是这道防火墙的问题？我在服务器上查过：本机防火墙（ufw）是关的、iptables 没有拦截规则、Caddy 确实在 80/443 监听、证书有效——但 Caddy 的访问日志里**收不到任何外部请求**。结论：请求在到达服务器之前就被 Lightsail 防火墙挡掉了。
>
> 一个佐证：证书能成功签发，说明 **80 端口是开的**（Let's Encrypt 签证书要从外部访问 80 做验证，它成功了）；但浏览器访问 **443 打不开**，说明 443 没开。所以缺的就是「在 Lightsail 防火墙放行 443」。

**这道防火墙在 AWS 控制台里，服务器内部改不了**（SSH 进去也没用），必须本人去点。

---

## 3. HTTPS 是怎么搭起来的（三个名词 + 为什么这么选）

### Caddy（反向代理 + 自动证书）
- **反向代理**：一个站在应用前面的「接待员」。浏览器的请求先到 Caddy，Caddy 再转给后面的应用（3000）。好处是 Caddy 可以统一负责 HTTPS、压缩、转发，应用本身啥都不用改。
- **为什么用 Caddy 而不是 Nginx**：Caddy **自动申请和续期 HTTPS 证书**，配置只要两行。Nginx 要自己折腾 certbot。
- 配置文件 `/etc/caddy/Caddyfile`：
  ```
  44-226-3-135.sslip.io {
      encode gzip zstd
      reverse_proxy localhost:3000
  }
  ```
  意思：有人访问这个域名 → 压缩后转发给本机 3000。就这么简单。

### 证书 与 Let's Encrypt
- **HTTPS 证书** = 一张「身份证明」，浏览器靠它确认「我连的真是这个网站、而且传输是加密的」，然后才显示绿锁、不报「不安全」。
- **Let's Encrypt** = 免费签发证书的机构。Caddy 自动找它签、自动每 ~90 天续期，全程不用管。
- **关键限制：Let's Encrypt 只给「域名」签证书，不给「裸 IP」签**。所以不能直接 `https://44.226.3.135`。

### sslip.io（把 IP 变成域名）
- 因为上面那条限制，我们需要一个域名。`sslip.io` 是个免费服务：**任何形如 `44-226-3-135.sslip.io` 的域名，它都自动解析回 `44.226.3.135`**（把 IP 用连字符编进域名里）。
- 于是 Caddy 就能拿这个域名去 Let's Encrypt 签到**真正可信的证书**（不是自签的、不会有警告）。
- 注意：是**连字符** `44-226-3-135`，不是点号。

> 一句话串起来：Caddy 在 443 接住请求 → 用 sslip.io 域名向 Let's Encrypt 申到可信证书 → 解密后转发给 3000 的应用。

---

## 4. 上 HTTPS 的完整步骤（runbook）

服务器侧我已经做好了（Caddy 装好、Caddyfile 配好、证书已签发成功，有效期到 2026-09，Caddy 会自动续）。**你只剩一步**：

1. 打开 **Lightsail 控制台** → 进入这台实例 → **Networking（网络）** 标签 → **IPv4 Firewall** → **Add rule**：
   - Application 选 **HTTPS**（自动填 TCP / 443）→ 创建
   - 确认列表里也有 **HTTP / 80**（应该已有，否则证书签不出来）
2. 等 ~30 秒，访问 **https://44-226-3-135.sslip.io** → 绿锁出现 → 语音/麦克风功能随之解锁（`getUserMedia` 等浏览器能力**必须在 HTTPS 或 localhost 才可用**，裸 http 下是 `undefined`）。

> 一次性配置命令（已执行，留档备查）：
> ```bash
> # 装 Caddy
> sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
> curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
> curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
> sudo apt-get update && sudo apt-get install -y caddy
> # 写 /etc/caddy/Caddyfile（域名 → 反代 :3000），然后：
> sudo systemctl enable caddy && sudo systemctl restart caddy
> # 验证（服务器内用 loopback，绕开「实例访问自己公网 IP」的 hairpin NAT 限制）：
> curl --resolve 44-226-3-135.sslip.io:443:127.0.0.1 https://44-226-3-135.sslip.io/login -o /dev/null -w "%{http_code} cert=%{ssl_verify_result}\n"
> ```

---

## 5. 以 HTTPS 为基准后，要注意的三件事

决定「以后只让大家登陆 HTTPS 地址」后：

### ① 两个地址的登录态是**互相独立**的
`http://44.226.3.135:3000` 和 `https://44-226-3-135.sslip.io` 在浏览器眼里是**两个不同站点**（主机名+端口都不同），登录 Cookie 不互通。**对外只发 HTTPS 这一个地址**，别来回切，否则会出现「明明登录了却又要登录」。

### ② Cookie 的 `secure` 开关（COOKIE_SECURE）
登录态是用 **iron-session** 加密后存在名为 `starport_session` 的 Cookie 里（见 `src/lib/session.ts`）。它的 `secure` 标志由环境变量控制：

```ts
// src/lib/session.ts — cookieOptions.secure
secure: process.env.COOKIE_SECURE === "false" ? false
      : process.env.COOKIE_SECURE === "true"  ? true
      : process.env.NODE_ENV === "production"          // 默认：生产为 true
```

- `secure: true` = 这个 Cookie **只在 HTTPS 下传输**（更安全，不会被 http 明文带走）。
- 当前服务器设的是 **`COOKIE_SECURE=false`**（在 `.env.production` 里），目的是让裸 `http://IP:3000` 也能登录（secure 若为 true，浏览器在 http 下根本不保存这个 Cookie，表现为「登录后又被要求重新登录」）。
- **以 HTTPS 为基准后的推荐做法**：等 443 放行、HTTPS 验证可用之后，把服务器 `.env.production` 改成 **`COOKIE_SECURE=true`** 再 `pm2 restart starport --update-env`。代价：`http://IP:3000` 那个地址将无法登录（但你已经不需要它了）。
- ⚠️ 顺序很重要：**别在 443 还没放行、HTTPS 还打不开时就设 `true`**，否则两个地址都登不上（http 因 secure 失效、https 因端口没开访问不了），会把自己锁在外面。

### ③ HTTPS 页面不能嵌入 http 内容（混合内容拦截）
浏览器会拦截 HTTPS 页面里加载的 http 资源（mixed content）。星港应用本身没这问题（都是相对路径 / dataURL）。唯一要留意：接入的外部应用若用 **iframe 嵌入**，对方也必须是 HTTPS；像 multillm 是「新标签页打开」模式（单独开 tab，不是嵌入），所以不受影响。

---

## 6. 想长期、正式给别人用，再加两件事

- **换个真域名（推荐）**：sslip.io 适合自测，但它是第三方服务、域名也丑（绑死在 IP 上）。花十几块买个真域名 → 把它的 DNS **A 记录指向 `44.226.3.135`** → 改 `/etc/caddy/Caddyfile` 里的域名为你的 → `sudo systemctl restart caddy`（Caddy 自动给新域名签证书）。
- **确认是静态 IP**：Lightsail 里看这台实例的 IP 是不是 **Static IP（已附加）**。动态 IP 在实例重启后会变，域名解析就失效了。静态 IP 免费（只要一直挂在实例上）。

---

## 7. 排错速查

| 现象 | 多半原因 | 怎么查 / 怎么修 |
|---|---|---|
| `http://IP:3000` 能开，`https://域名` 打不开 | Lightsail 防火墙没放行 443 | 控制台 Networking 加 HTTPS(443) 规则 |
| 浏览器报证书警告 | 用了裸 IP 或自签证书 | 必须用 sslip.io / 真域名走 Let's Encrypt |
| 登录后又被要求登录 | Cookie 的 secure 与协议不匹配 | http 下需 `COOKIE_SECURE=false`；纯 HTTPS 用 `true` |
| HTTPS 下某块内容不显示 | 混合内容（嵌了 http 资源） | 让被嵌内容也走 HTTPS |
| 服务器内 `curl 公网IP` 不通但外部能通 | hairpin NAT（实例访问自己公网 IP 的限制） | 用 `--resolve 域名:443:127.0.0.1` 走 loopback 验证 |
| 证书没签出来 | 80 端口没放行 | Let's Encrypt 的 HTTP-01 验证要访问 80，先放行 80 |

- 看 Caddy 状态/日志：`systemctl status caddy`、`sudo journalctl -u caddy -f`。
- 看应用日志：`pm2 logs starport`。

---

## 小结（一段话讲完）

应用本体在云服务器 3000 端口跑、PM2 守护、一条 `deploy.sh` 滚动更新。要上 HTTPS：用 **Caddy** 做反向代理在 443 接住请求转给 3000，用 **sslip.io 域名** + **Let's Encrypt** 拿到免费可信证书（裸 IP 签不了证书，所以要域名）。最后的闸门是 **Lightsail 防火墙必须放行 443**——这一步在 AWS 控制台、本人操作。上了 HTTPS 后，对外只发 HTTPS 地址、把 `COOKIE_SECURE` 切成 `true`、长期化再换真域名 + 静态 IP。HTTPS 是麦克风/语音等浏览器能力的硬前提（secure context）。
