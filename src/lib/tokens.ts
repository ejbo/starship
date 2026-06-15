import "server-only";
import { randomBytes } from "node:crypto";

export function generateClientId(): string {
  return "app_" + randomBytes(8).toString("hex");
}

export function generateAppSecret(): string {
  return "sk_app_" + randomBytes(24).toString("hex");
}

export function generateAccessToken(): string {
  return "at_" + randomBytes(24).toString("hex");
}

export function generateAuthCode(): string {
  return "code_" + randomBytes(16).toString("hex");
}

/** 好友码：8 位纯数字（首位非 0，便于口头/手输添加；不带任何前缀） */
export function generateFriendCode(): string {
  const bytes = randomBytes(8);
  let s = String((bytes[0] % 9) + 1); // 首位 1–9，保证恒为 8 位
  for (let i = 1; i < 8; i++) s += String(bytes[i] % 10);
  return s;
}

/** 规范化用户输入的好友码：抽出数字（容错空格/连字符/历史 SP- 前缀） */
export function normalizeFriendCode(input: string): string {
  return input.replace(/\D/g, "");
}

/** 输入是否「像」一个好友码（4–8 位数字），用于决定按码还是按用户名解析 */
export function looksLikeFriendCode(input: string): boolean {
  const digits = normalizeFriendCode(input);
  return digits.length >= 4 && digits.length <= 8;
}

/** name → 候选 slug（小写、连字符、去非法字符） */
export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "app";
}
