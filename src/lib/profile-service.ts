import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export interface EditableProfile {
  handle: string;
  friendCode: string | null;
  name: string;
  signature: string;
  avatarHue: number;
}

export async function getEditableProfile(): Promise<EditableProfile> {
  const userId = await getSessionUserId();
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { handle: true, friendCode: true, name: true, signature: true, avatarHue: true },
  });
  return u;
}

export interface UpdateProfileInput {
  name: string;
  signature: string;
  avatarHue: number;
}

export async function updateProfile(input: UpdateProfileInput): Promise<void> {
  const userId = await getSessionUserId();
  const name = input.name.trim();
  if (!name) throw new Error("昵称不能为空");
  if (name.length > 24) throw new Error("昵称最多 24 个字");
  const hue = Math.max(0, Math.min(359, Math.round(input.avatarHue)));

  // 昵称去规范化冗余存储在 Review/ActivityEvent 等处，更新当前用户的展示名同步评测署名
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name, signature: input.signature.trim().slice(0, 120), avatarHue: hue },
    }),
    prisma.review.updateMany({ where: { authorUserId: userId }, data: { authorName: name, avatarHue: hue } }),
  ]);
}
