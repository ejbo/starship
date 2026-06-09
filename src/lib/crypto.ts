import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * API Key 信封加密：AES-256-GCM。
 * 密文格式：base64(iv).base64(authTag).base64(ciphertext)
 * 解密只发生在 Gateway 代理请求的瞬间；原始 Key 永不下发前端或第三方应用。
 */

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.STARPORT_SECRET;
  if (!hex || hex.length !== 64) {
    throw new Error("STARPORT_SECRET 缺失或长度不为 64（需 32 字节 hex）。生成：openssl rand -hex 32");
  }
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(packed: string): string {
  const [ivB64, tagB64, dataB64] = packed.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("密文格式非法");
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

/** 展示用末 4 位（密钥本体绝不展示） */
export function last4(secret: string): string {
  return secret.slice(-4);
}
