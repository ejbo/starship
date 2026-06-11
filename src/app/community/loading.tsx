import { Skeleton } from "@/components/ui/skeleton";

export default function CommunityLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Skeleton className="mb-6 h-7 w-24" />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="capsule overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="aspect-[21/9] rounded-none" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
