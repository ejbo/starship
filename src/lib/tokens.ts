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

/** name → 候选 slug（小写、连字符、去非法字符） */
export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "app";
}
