import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminProductForm } from "@/components/admin/admin-product-form";
import { getProductForEdit } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductForEdit(id);
  if (!product) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="flex items-center gap-1 text-sm text-dim hover:text-accent">
          <ArrowLeft className="size-4" /> 返回产品列表
        </Link>
        <span className="text-mute">/</span>
        <h2 className="text-lg font-bold">{product.name}</h2>
        <Link
          href={`/p/${product.slug}`}
          target="_blank"
          className="flex items-center gap-1 text-xs text-dim hover:text-accent"
        >
          预览详情页 <ExternalLink className="size-3" />
        </Link>
      </div>
      <AdminProductForm product={product} />
    </div>
  );
}
