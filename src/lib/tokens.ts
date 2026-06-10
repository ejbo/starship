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

/** 好友码：SP- + 6 位无歧义字符（去掉 0/O/1/I 等） */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function generateFriendCode(): string {
  const bytes = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return "SP-" + s;
}

/** 规范化用户输入的好友码（容错大小写/空格/缺前缀） */
export function normalizeFriendCode(input: string): string {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  const body = raw.startsWith("SP-") ? raw.slice(3) : raw;
  return "SP-" + body;
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
