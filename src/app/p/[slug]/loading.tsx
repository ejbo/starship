import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Skeleton className="mb-4 h-3 w-40" />
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-80" />
      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <Skeleton className="aspect-video rounded-lg" />
          <div className="flex gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video w-24 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </main>
  );
}
