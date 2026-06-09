/**
 * 把 Phase 0 的 mock 数据灌入数据库（幂等：先清空再插入）。
 * 运行：pnpm db:seed
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { products } from "../src/lib/mock/products";
import { activity } from "../src/lib/mock/activity";
import { currentUser, friends } from "../src/lib/mock/users";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  await prisma.activityEvent.deleteMany();
  await prisma.libraryEntry.deleteMany();
  await prisma.review.deleteMany();
  await prisma.friendEdge.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id,
        slug: p.slug,
        type: p.type,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        hueA: p.art.hueA,
        hueB: p.art.hueB,
        icon: p.art.icon,
        tags: p.tags,
        ratingScore: p.rating.score,
        ratingCount: p.rating.count,
        histogram: p.rating.histogram,
        acquisitions: p.acquisitions,
        developer: p.developer,
        version: p.version ?? null,
        entryUrl: p.entry?.url ?? null,
        priceCredits: p.price === "free" ? null : p.price.credits,
        capabilities: p.capabilities,
        releasedAt: p.releasedAt,
        updatedAt: p.updatedAt,
        featured: p.featured ?? false,
        reviews: {
          create: p.reviews.map((r) => ({
            authorName: r.author,
            avatarHue: r.avatarHue,
            isAgent: r.isAgent ?? false,
            score: r.score,
            usageHours: r.usageHours,
            helpful: r.helpful,
            body: r.body,
            date: r.date,
          })),
        },
      },
    });
  }

  const me = await prisma.user.create({
    data: {
      handle: currentUser.handle,
      name: currentUser.name,
      avatarHue: currentUser.avatarHue,
      level: currentUser.level,
      signature: currentUser.signature,
      tokenBalance: currentUser.tokenBalance,
      badges: currentUser.badges,
      showcase: currentUser.showcase,
    },
  });

  for (const f of friends) {
    const friend = await prisma.user.create({
      data: {
        handle: f.handle,
        name: f.name,
        avatarHue: f.avatarHue,
        level: f.level,
      },
    });
    await prisma.friendEdge.create({ data: { aId: me.id, bId: friend.id } });
  }

  const productBySlug = new Map(products.map((p) => [p.slug, p.id]));
  for (const entry of currentUser.library) {
    const productId = productBySlug.get(entry.slug);
    if (!productId) continue;
    await prisma.libraryEntry.create({
      data: {
        userId: me.id,
        productId,
        acquiredAt: entry.acquiredAt,
        lastUsedAt: entry.lastUsedAt ?? null,
        usageHours: entry.usageHours,
      },
    });
  }

  let sort = 0;
  for (const event of activity) {
    await prisma.activityEvent.create({
      data: {
        actorName: event.actor.name,
        actorHue: event.actor.avatarHue,
        actorIsAgent: event.actor.isAgent ?? false,
        verb: event.verb,
        productSlug: event.productSlug ?? null,
        detail: event.detail ?? null,
        at: event.at,
        sort: sort++,
      },
    });
  }

  const counts = {
    products: await prisma.product.count(),
    reviews: await prisma.review.count(),
    users: await prisma.user.count(),
    friendEdges: await prisma.friendEdge.count(),
    libraryEntries: await prisma.libraryEntry.count(),
    activity: await prisma.activityEvent.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
