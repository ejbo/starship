import "server-only";
import { prisma } from "@/lib/db";
import { encryptSecret, last4 } from "@/lib/crypto";
import { getSessionUserId } from "@/lib/session";
import { capabilityProvider, providers } from "@/lib/providers";

export interface CredentialView {
  id: string;
  provider: string;
  label: string;
  last4: string;
  dailyTokenLimit: number | null;
  createdAt: string;
}

export async function listCredentials(): Promise<CredentialView[]> {
  const userId = await getSessionUserId();
  const rows = await prisma.apiCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, provider: true, label: true, last4: true, dailyTokenLimit: true, createdAt: true },
  });
  return rows;
}

export interface AddCredentialInput {
  provider: string;
  label: string;
  secret: string;
  dailyTokenLimit: number | null;
}

export async function addCredential(input: AddCredentialInput): Promise<void> {
  const userId = await getSessionUserId();
  const secret = input.secret.trim();
  if (!secret) throw new Error("密钥不能为空");
  if (!providers.some((p) => p.id === input.provider)) throw new Error("未知的 Provider");

  await prisma.apiCredential.create({
    data: {
      userId,
      provider: input.provider,
      label: input.label.trim() || "默认",
      ciphertext: encryptSecret(secret),
      last4: last4(secret),
      dailyTokenLimit: input.dailyTokenLimit,
      createdAt: today(),
    },
  });
}

export async function deleteCredential(id: string): Promise<void> {
  const userId = await getSessionUserId();
  // 限定 userId，避免越权删除
  await prisma.apiCredential.deleteMany({ where: { id, userId } });
}

export interface ProviderCoverage {
  provider: string;
  configured: boolean;
  /** 平台上需要该 provider 的产品数 */
  appCount: number;
}

/** 聚合 catalog 的 capabilities → 每个 provider 被多少应用需要、是否已配置 */
export async function getProviderCoverage(): Promise<ProviderCoverage[]> {
  const userId = await getSessionUserId();
  const [configuredRows, productRows] = await Promise.all([
    prisma.apiCredential.findMany({ where: { userId }, select: { provider: true }, distinct: ["provider"] }),
    prisma.product.findMany({ select: { capabilities: true } }),
  ]);
  const configured = new Set(configuredRows.map((r) => r.provider));

  const counts = new Map<string, number>();
  for (const p of productRows) {
    const provs = new Set<string>();
    for (const cap of p.capabilities) {
      const prov = capabilityProvider(cap);
      if (prov) provs.add(prov);
    }
    for (const prov of provs) counts.set(prov, (counts.get(prov) ?? 0) + 1);
  }

  return providers.map((p) => ({
    provider: p.id,
    configured: configured.has(p.id),
    appCount: counts.get(p.id) ?? 0,
  }));
}

function today(): string {
  // 展示用日期字符串（与现有 mock 日期同构）；Phase 1b 迁 DateTime
  return new Date().toISOString().slice(0, 10);
}
