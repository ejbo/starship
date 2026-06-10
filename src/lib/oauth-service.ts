import "server-only";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { generateAccessToken, generateAuthCode } from "@/lib/tokens";

export const ALL_SCOPES = ["identity", "achievements:write", "stats:write", "gateway:llm"] as const;
export type Scope = (typeof ALL_SCOPES)[number];

const CODE_TTL_MS = 10 * 60 * 1000;

export interface AppInfo {
  productId: string;
  name: string;
  developer: string;
}

export async function getAppByClientId(clientId: string): Promise<AppInfo | null> {
  const p = await prisma.product.findUnique({
    where: { clientId },
    select: { id: true, name: true, developer: true },
  });
  return p ? { productId: p.id, name: p.name, developer: p.developer } : null;
}

/** 用户在授权页同意后调用：为 (app, user) 生成授权码 */
export async function issueAuthCode(clientId: string, userId: string, scopes: string[]): Promise<string> {
  const app = await prisma.product.findUnique({ where: { clientId }, select: { id: true } });
  if (!app) throw new Error("未知 client_id");
  const valid = scopes.filter((s) => (ALL_SCOPES as readonly string[]).includes(s));
  const code = generateAuthCode();
  const codeExpiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await prisma.oAuthGrant.upsert({
    where: { productId_userId: { productId: app.id, userId } },
    update: { scopes: valid, code, codeExpiresAt },
    create: { productId: app.id, userId, scopes: valid, code, codeExpiresAt, createdAt: new Date().toISOString() },
  });
  return code;
}

export interface TokenResult {
  accessToken: string;
  scopes: string[];
}

/** 服务器到服务器：code + client 凭证 → access token */
export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<TokenResult> {
  const product = await prisma.product.findUnique({
    where: { clientId },
    select: { id: true, clientSecretHash: true },
  });
  if (!product || !product.clientSecretHash) throw new Error("invalid_client");
  if (!verifyPassword(clientSecret, product.clientSecretHash)) throw new Error("invalid_client");

  const grant = await prisma.oAuthGrant.findUnique({ where: { code } });
  if (!grant || grant.productId !== product.id) throw new Error("invalid_grant");
  if (grant.codeExpiresAt && Date.parse(grant.codeExpiresAt) < Date.now()) throw new Error("invalid_grant");

  const accessToken = generateAccessToken();
  await prisma.oAuthGrant.update({
    where: { id: grant.id },
    data: { accessToken, code: null, codeExpiresAt: null },
  });
  return { accessToken, scopes: grant.scopes };
}

export interface ResolvedToken {
  userId: string;
  productId: string;
  scopes: string[];
}

export async function resolveAccessToken(token: string): Promise<ResolvedToken | null> {
  const grant = await prisma.oAuthGrant.findUnique({
    where: { accessToken: token },
    select: { userId: true, productId: true, scopes: true },
  });
  return grant ?? null;
}
