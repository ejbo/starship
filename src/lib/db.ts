import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildClient(): PrismaClient {
  const url = process.env.DATABASE_URL!;
  // 连接串里带 ?schema=xxx 时，让驱动适配器把查询打到该 schema（生产用 starport，
  // 与同库其他项目隔离）。本地 .env 不带该参数 → 默认 public。
  let schema: string | undefined;
  try {
    schema = new URL(url).searchParams.get("schema") ?? undefined;
  } catch {
    // DATABASE_URL 非标准格式时忽略，退回默认 schema
  }
  const adapter = new PrismaPg(
    { connectionString: url },
    schema ? { schema } : undefined,
  );
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
