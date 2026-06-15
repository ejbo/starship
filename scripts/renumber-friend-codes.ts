/**
 * 把历史「SP-XXXXXX」好友码改为 8 位纯数字（幂等：已是 6–8 位纯数字的跳过）。
 * 同时给缺码用户补码。逐个分配并保证全站唯一。
 *
 * 运行：npx tsx scripts/renumber-friend-codes.ts   （目标库取 DATABASE_URL，与 seed 一致）
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });

import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL!;
let schema: string | undefined;
try {
  schema = new URL(url).searchParams.get("schema") ?? undefined;
} catch {
  /* 非标准 URL */
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }, schema ? { schema } : undefined) });

function gen(): string {
  const b = randomBytes(8);
  let s = String((b[0] % 9) + 1);
  for (let i = 1; i < 8; i++) s += String(b[i] % 10);
  return s;
}

const isNumeric = (c: string | null) => !!c && /^\d{6,8}$/.test(c);

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, handle: true, friendCode: true } });
  const taken = new Set(users.map((u) => u.friendCode).filter(isNumeric) as string[]);

  async function uniqueCode(): Promise<string> {
    for (let i = 0; i < 100; i++) {
      const c = gen();
      if (taken.has(c)) continue;
      const clash = await prisma.user.findUnique({ where: { friendCode: c }, select: { id: true } });
      if (!clash) {
        taken.add(c);
        return c;
      }
    }
    throw new Error("好友码空间耗尽（不应发生）");
  }

  let changed = 0;
  for (const u of users) {
    if (isNumeric(u.friendCode)) continue;
    const code = await uniqueCode();
    await prisma.user.update({ where: { id: u.id }, data: { friendCode: code } });
    console.log(`  ${u.handle}: ${u.friendCode ?? "(空)"} → ${code}`);
    changed++;
  }
  console.log(`完成：${changed} 个用户重新编号，${users.length - changed} 个已是数字码跳过。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
