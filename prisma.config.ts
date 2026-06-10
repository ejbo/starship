import { config as dotenv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma CLI 不继承 Next.js 的 env 加载，这里复刻其顺序。
dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });
// 实例上只有 .env.production（.env 被 gitignore 不会拉下来）；override:false 保证
// 本地有 .env(5544) 时仍优先本地，互不影响。
dotenv({ path: ".env.production", override: false });

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
