#!/usr/bin/env node
// 启动自举：确保目标 schema 存在，并应用所有数据库迁移。幂等，可反复执行。
// 由 `pnpm start` 自动调用，也可手动 `pnpm db:bootstrap`。
import { config as dotenv } from "dotenv";
import pg from "pg";
import { spawnSync } from "node:child_process";

// 复刻 prisma.config.ts 的 env 加载顺序（先 .env.local，再 .env，最后 .env.production 兜底）。
// override:false → 先出现的值优先：本地有 .env(5544) 时用本地；实例只有 .env.production 时用生产。
dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });
dotenv({ path: ".env.production", override: false });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[bootstrap] DATABASE_URL 未设置，无法自举数据库");
  process.exit(1);
}

let schema = "public";
try {
  schema = new URL(url).searchParams.get("schema") || "public";
} catch {
  // 非标准 URL：退回 public
}

// Lightsail/RDS 证书 node 默认不信任；连接串里写了 sslmode 时统一免验证。
const ssl = /sslmode=(require|no-verify|prefer|verify-ca|verify-full)/i.test(url)
  ? { rejectUnauthorized: false }
  : undefined;

// 1) 确保 schema 存在（迁移 SQL 是非限定表名，靠 search_path 落到该 schema）。
const client = new pg.Client({ connectionString: url, ssl });
try {
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema.replace(/"/g, '""')}"`);
  console.log(`[bootstrap] ✓ schema "${schema}" 就绪`);
} catch (e) {
  console.error(`[bootstrap] 创建 schema 失败：${e.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}

// 2) 应用迁移（migrate deploy 幂等：无待迁移时秒过）。
console.log("[bootstrap] 应用数据库迁移 …");
const res = spawnSync("pnpm", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(res.status ?? 1);
