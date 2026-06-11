import { CardRowSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function StoreLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 pt-6 sm:px-6">
      <Skeleton className="aspect-[21/7] rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-3 md:grid-cols-[1.7fr_1fr]">
          <Skeleton className="aspect-[21/9] rounded-xl" />
          <Skeleton className="hidden rounded-xl md:block" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <CardRowSkeleton />
      <CardRowSkeleton />
    </main>
  );
}
