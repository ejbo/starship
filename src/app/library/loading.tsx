import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Skeleton className="mb-6 h-7 w-24" />
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <Skeleton className="hidden h-72 rounded-lg lg:block" />
        <div className="space-y-6">
          <Skeleton className="aspect-[3/1] rounded-lg" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
