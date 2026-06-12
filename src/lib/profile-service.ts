import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export interface EditableProfile {
  handle: string;
  friendCode: string | null;
  name: string;
  signature: string;
  avatarHue: number;
  avatarUrl: string | null;
  profileBannerUrl: string | null;
}

export async function getEditableProfile(): Promise<EditableProfile> {
  const userId = await getSessionUserId();
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { handle: true, friendCode: true, name: true, signature: true, avatarHue: true, avatarUrl: true, profileBannerUrl: true },
  });
  return u;
}

export interface PublicProfile {
  id: string;
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  level: number;
  signature: string;
  friendCode: string | null;
  showcase: string[];
  badges: { label: string; icon: string }[];
}

/** 任意用户的公开主页（按 handle）。不存在返回 null。 */
export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  const u = await prisma.user.findUnique({
    where: { handle },
    select: {
      id: true,
      handle: true,
      name: true,
      avatarHue: true,
      avatarUrl: true,
      level: true,
      signature: true,
      friendCode: true,
      showcase: true,
      badges: true,
    },
  });
  if (!u) return null;
  return { ...u, badges: (u.badges as { label: string; icon: string }[]) ?? [] };
}

const MAX_AVATAR_BYTES = 400_000; // 压缩后的 data URL 上限

/** 设置/清除上传头像（dataUrl 为空字符串则清除，回退色相头像） */
export async function updateAvatar(dataUrl: string): Promise<void> {
  const userId = await getSessionUserId();
  if (!dataUrl) {
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    return;
  }
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) throw new Error("仅支持 PNG/JPEG/WebP 图片");
  if (dataUrl.length > MAX_AVATAR_BYTES) throw new Error("图片过大，请换更小的图");
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: dataUrl } });
}

const MAX_BANNER_BYTES = 2_600_000; // dataURL 上限（约 2MB 原始，GIF 不压缩保留动画）

/** 设置/清除资料背景（好友悬停卡展示）。支持上传 dataURL 或图片/mp4/webm 直链。 */
export async function updateProfileBanner(url: string): Promise<void> {
  const userId = await getSessionUserId();
  const clean = url.trim();
  if (!clean) {
    await prisma.user.update({ where: { id: userId }, data: { profileBannerUrl: null } });
    return;
  }
  const isData = /^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm));base64,/.test(clean);
  const isHttp = /^https?:\/\/\S+$/.test(clean);
  if (!isData && !isHttp) throw new Error("仅支持上传图片/GIF，或 http(s) 图片/mp4/webm 直链");
  if (isData && clean.length > MAX_BANNER_BYTES) throw new Error("文件过大（上限约 2MB）");
  if (isHttp && clean.length > 600) throw new Error("链接过长");
  await prisma.user.update({ where: { id: userId }, data: { profileBannerUrl: clean } });
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
