import { requireAdmin } from "@/lib/admin-service";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // 非管理员踢回首页

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">管理后台</h1>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
