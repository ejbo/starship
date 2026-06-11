import { BannerManager } from "@/components/admin/banner-manager";
import { listBannersAdmin } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const banners = await listBannersAdmin();
  return (
    <div className="space-y-4">
      <p className="text-sm text-dim">首页顶部大横幅。启用中的会按排序显示（多个则自动轮播）。</p>
      <BannerManager
        banners={banners.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          badge: b.badge,
          imageUrl: b.imageUrl,
          href: b.href,
          active: b.active,
          sort: b.sort,
        }))}
      />
    </div>
  );
}
