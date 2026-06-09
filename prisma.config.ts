import { config as dotenv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma CLI 不继承 Next.js 的 env 加载，这里复刻其顺序。
dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env<Env>("DATABASE_URL"),
  },
});
