/**
 * 回填社交演示数据（幂等，不清库）：
 * - 离线种子好友补「最后在线」时间（好友列表显示「最后在线 X 前」）
 * - 部分种子好友补资料背景（悬停卡演示；shanyue 为视频动态背景）
 * - 补两个离线种子好友 chenzhou / qingteng（加为 me 的好友）
 * - 若还没有任何群组，则创建演示群「周五圆桌组」（多频道 + 历史消息）
 *
 * 运行：npx tsx scripts/backfill-social.ts   （目标库取 DATABASE_URL，与 seed 一致）
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });

import { randomBytes, scryptSync } from "node:crypto";
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

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function friendCode(): string {
  const b = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return "SP-" + s;
}

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
const U = (id: string, w: number) => `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

async function main() {
  // 1) 最后在线 + 资料背景
  const updates: Record<string, { lastSeenAt?: string; profileBannerUrl?: string }> = {
    linyuan: { profileBannerUrl: U("photo-1451187580459-43490279c0fa", 800) },
    bluewhale: { profileBannerUrl: U("photo-1526374965328-7f61d4dc18c5", 800) },
    azhi: { profileBannerUrl: U("photo-1620641788421-7a1c342ea42e", 800) },
    shanyue: { profileBannerUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
    oldcat: { lastSeenAt: iso(26 * 60) },
  };
  for (const [handle, data] of Object.entries(updates)) {
    const u = await prisma.user.findUnique({ where: { handle }, select: { id: true, lastSeenAt: true, profileBannerUrl: true } });
    if (!u) continue;
    await prisma.user.update({
      where: { handle },
      data: {
        // 不覆盖已有真实数据
        ...(data.lastSeenAt && !u.lastSeenAt ? { lastSeenAt: data.lastSeenAt } : {}),
        ...(data.profileBannerUrl && !u.profileBannerUrl ? { profileBannerUrl: data.profileBannerUrl } : {}),
      },
    });
    console.log("更新", handle);
  }

  // 2) 新离线好友（不存在才建）
  const me = await prisma.user.findUnique({ where: { handle: "me" }, select: { id: true } });
  const newFriends = [
    { handle: "chenzhou", name: "沉舟", avatarHue: 260, level: 22, lastSeenAt: iso(5 * 60) },
    { handle: "qingteng", name: "青藤", avatarHue: 70, level: 8, lastSeenAt: iso(3 * 24 * 60) },
  ];
  for (const f of newFriends) {
    let u = await prisma.user.findUnique({ where: { handle: f.handle }, select: { id: true } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          handle: f.handle,
          friendCode: friendCode(),
          name: f.name,
          passwordHash: hashPassword("friend123"),
          avatarHue: f.avatarHue,
          level: f.level,
          presenceKind: "offline",
          lastSeenAt: f.lastSeenAt,
        },
        select: { id: true },
      });
      console.log("创建用户", f.handle);
    }
    if (me) {
      const edge = await prisma.friendEdge.findFirst({
        where: { OR: [{ aId: me.id, bId: u.id }, { aId: u.id, bId: me.id }] },
        select: { id: true },
      });
      if (!edge) {
        await prisma.friendEdge.create({ data: { aId: me.id, bId: u.id, status: "accepted" } });
        console.log("加好友", f.handle);
      }
    }
  }

  // 3) 演示群组（库里还没有任何群组才建）
  if (me && (await prisma.chatGroup.count()) === 0) {
    const handles = ["linyuan", "bluewhale", "azhi", "shanyue"];
    const members = await prisma.user.findMany({ where: { handle: { in: handles } }, select: { id: true, handle: true } });
    if (members.length > 0) {
      const group = await prisma.chatGroup.create({
        data: {
          name: "周五圆桌组",
          ownerId: me.id,
          createdAt: iso(7 * 24 * 60),
          members: { create: [{ userId: me.id, joinedAt: iso(7 * 24 * 60) }, ...members.map((m) => ({ userId: m.id, joinedAt: iso(7 * 24 * 60) }))] },
          channels: {
            create: [
              { name: "大厅", kind: "text", sort: 0 },
              { name: "资料分享", kind: "text", sort: 1 },
              { name: "圆桌语音", kind: "voice", sort: 2 },
            ],
          },
        },
        include: { channels: true },
      });
      const hall = group.channels.find((c) => c.name === "大厅")!;
      const share = group.channels.find((c) => c.name === "资料分享")!;
      const byHandle = new Map(members.map((m) => [m.handle, m.id]));
      const chat: Array<[string, string, number]> = [
        ["bluewhale", "周五圆桌确认一下时间，还是晚上八点？", 26 * 60],
        ["linyuan", "可以，我提前把对比测试跑完", 25 * 60 + 40],
        ["azhi", "纪要 Agent 我带新的来，这次能区分结论和待办", 25 * 60 + 20],
        ["me", "OK，八点见。开了个「资料分享」频道，材料丢那边", 24 * 60],
        ["shanyue", "收到 👌", 23 * 60 + 50],
      ];
      for (const [h, body, minsAgo] of chat) {
        const fromId = h === "me" ? me.id : byHandle.get(h);
        if (!fromId) continue;
        await prisma.groupMessage.create({ data: { groupId: group.id, channelId: hall.id, fromId, body, at: iso(minsAgo) } });
      }
      const lin = byHandle.get("linyuan");
      if (lin) {
        await prisma.groupMessage.create({
          data: { groupId: group.id, channelId: share.id, fromId: lin, body: "上周说的多模型对比表格整理好了，回头发这里", at: iso(20 * 60) },
        });
      }
      console.log("创建群组：周五圆桌组");
    }
  }

  // 4) 演示托管 Agent（不存在才建，加为 me 好友）
  if (me) {
    let nova = await prisma.user.findUnique({ where: { handle: "nova" }, select: { id: true } });
    if (!nova) {
      nova = await prisma.user.create({
        data: {
          handle: "nova",
          name: "Nova",
          kind: "agent",
          agentOwnerId: me.id,
          agentKind: "hosted",
          agentPersona: "你是 Nova，星港平台的助理 Agent。简洁、靠谱、偶尔用一个 emoji。",
          avatarHue: 265,
          level: 1,
          signature: "星港托管助理 · 随时在线",
          lastSeenAt: new Date().toISOString(),
        },
        select: { id: true },
      });
      const edge = await prisma.friendEdge.findFirst({
        where: { OR: [{ aId: me.id, bId: nova.id }, { aId: nova.id, bId: me.id }] },
        select: { id: true },
      });
      if (!edge) await prisma.friendEdge.create({ data: { aId: me.id, bId: nova.id, status: "accepted" } });
      console.log("创建演示 Agent：Nova");
    }
  }

  console.log("回填完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
