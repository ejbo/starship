import "server-only";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionUser } from "@/lib/session";
import { generateFriendCode } from "@/lib/tokens";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/** 生成全站唯一的好友码 */
async function uniqueFriendCode(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const code = generateFriendCode();
    const taken = await prisma.user.findUnique({ where: { friendCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error("好友码生成失败，请重试");
}

export async function register(handle: string, name: string, password: string): Promise<void> {
  const h = handle.trim().toLowerCase();
  if (!HANDLE_RE.test(h)) throw new Error("用户名需为 3–20 位小写字母、数字或下划线");
  if (password.length < 6) throw new Error("密码至少 6 位");
  const displayName = name.trim() || h;

  const existing = await prisma.user.findUnique({ where: { handle: h }, select: { id: true } });
  if (existing) throw new Error("该用户名已被占用");

  const user = await prisma.user.create({
    data: {
      handle: h,
      friendCode: await uniqueFriendCode(),
      name: displayName,
      passwordHash: hashPassword(password),
      avatarHue: hueFromString(h),
      level: 1,
      signature: "新加入星港",
      tokenBalance: "0",
      badges: [{ label: "新船员", icon: "sparkles" }],
    },
  });
  await setSessionUser(user.id);
}

export async function login(handle: string, password: string): Promise<void> {
  const h = handle.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { handle: h },
    select: { id: true, passwordHash: true },
  });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new Error("用户名或密码错误");
  }
  await setSessionUser(user.id);
}

/** 由 handle 稳定派生头像色相 */
function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
