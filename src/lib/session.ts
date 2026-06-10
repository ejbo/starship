import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

interface SessionData {
  userId?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD!,
  cookieName: "starport_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS 下用 secure cookie。纯 HTTP demo（http://IP:3000）必须设 COOKIE_SECURE=false，
    // 否则浏览器不保存登录 cookie，表现为"登录后又被要求重新登录"。上了 HTTPS 再删掉它。
    secure:
      process.env.COOKIE_SECURE === "false"
        ? false
        : process.env.COOKIE_SECURE === "true"
          ? true
          : process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function setSessionUser(userId: string) {
  const session = await getSession();
  session.userId = userId;
  await session.save();
}

export async function clearSession() {
  const session = await getSession();
  session.destroy();
}

/** 未登录返回 null */
export async function getSessionUserIdOrNull(): Promise<string | null> {
  const session = await getSession();
  if (!session.userId) return null;
  // 校验用户仍存在
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true } });
  return user?.id ?? null;
}

/** 需登录页面/动作调用：未登录跳转 /login */
export async function getSessionUserId(): Promise<string> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) redirect("/login");
  return userId;
}
