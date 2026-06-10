#!/usr/bin/env node
// 把平台里的 multillm-chat 造物配成可"新标签页启动"的 OAuth 应用：
// launchMode=newtab + clientId + clientSecretHash + 公网 entryUrl + owner=me。
// 由 deploy/setup-multillm.sh 调用，也可单独跑（需先 export 下面几个 env）。
import { config as dotenv } from "dotenv";
import { scryptSync, randomBytes } from "node:crypto";
import pg from "pg";

dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });
dotenv({ path: ".env.production", override: false });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[multillm] DATABASE_URL 未设置");
  process.exit(1);
}
let schema = "public";
try {
  schema = new URL(url).searchParams.get("schema") || "public";
} catch {}
const ssl = /sslmode=(require|no-verify|prefer|verify-ca|verify-full)/i.test(url)
  ? { rejectUnauthorized: false }
  : undefined;

const clientId = process.env.MULTILLM_CLIENT_ID || "app_multillm";
const clientSecret = process.env.MULTILLM_CLIENT_SECRET || "sk_app_multillm_demo";
const entryUrl = process.env.MULTILLM_ENTRY_URL; // 形如 http://<公网IP>:4000
if (!entryUrl) {
  console.error("[multillm] MULTILLM_ENTRY_URL 未设置（应为 http://<公网IP>:4000）");
  process.exit(1);
}

// 复刻 src/lib/password.ts 的 hashPassword：scrypt + 16 字节随机盐，存 salt(hex):hash(hex)。
function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

const q = (name) => `"${schema}"."${name}"`;
const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
try {
  const me = await client.query(`select id from ${q("User")} where handle = 'me' limit 1`);
  const ownerId = me.rows[0]?.id ?? null;

  const r = await client.query(
    `update ${q("Product")}
        set "launchMode" = 'newtab',
            "clientId" = $1,
            "clientSecretHash" = $2,
            "entryUrl" = $3,
            "ownerUserId" = coalesce("ownerUserId", $4),
            status = 'published'
      where slug = 'multillm-chat'
      returning slug, "launchMode", "clientId", "entryUrl", status`,
    [clientId, hashPassword(clientSecret), entryUrl, ownerId],
  );
  if (r.rowCount === 0) {
    console.error("[multillm] 未找到 slug=multillm-chat 的造物（先确认平台已 seed）");
    process.exit(1);
  }
  console.log("[multillm] 已配置造物:", JSON.stringify(r.rows[0]));
  console.log(`[multillm] client_id=${clientId}  client_secret=${clientSecret}`);
} finally {
  await client.end().catch(() => {});
}
