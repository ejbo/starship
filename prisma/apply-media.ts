// 只把媒体字段（capsule/banner/截图）写到现有产品上，不动其它数据。
// 跑法：DATABASE_URL='...starport' pnpm tsx prisma/apply-media.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PRODUCT_MEDIA } from "./product-media";

const url = process.env.DATABASE_URL!;
let schema: string | undefined;
try {
  schema = new URL(url).searchParams.get("schema") ?? undefined;
} catch {}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }, schema ? { schema } : undefined),
});

async function main() {
  let updated = 0;
  for (const [slug, media] of Object.entries(PRODUCT_MEDIA)) {
    const res = await prisma.product.updateMany({
      where: { slug },
      data: {
        capsuleUrl: media.capsuleUrl,
        bannerUrl: media.bannerUrl,
        screenshotUrls: media.screenshotUrls,
      },
    });
    if (res.count > 0) updated++;
    else console.log(`(跳过 ${slug}：库里无此产品)`);
  }
  console.log(`已为 ${updated} 个产品写入真实媒体。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
