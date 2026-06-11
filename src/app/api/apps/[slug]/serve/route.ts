import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * 托管单页应用的 HTML 出口：返回开发者上传的 HTML，供沙箱 iframe 加载。
 * CSP `sandbox` 头确保即便被直接打开也运行在 opaque origin（不以平台源执行），
 * 防止任意 HTML 借平台域做坏事。
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, select: { hostedHtml: true } });
  if (!product?.hostedHtml) return new Response("Not found", { status: 404 });

  return new Response(product.hostedHtml, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "sandbox allow-scripts allow-forms allow-popups allow-modals",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
  });
}
