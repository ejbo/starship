import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Skeleton className="mb-5 h-7 w-32" />
      <div className="grid gap-6 lg:grid-cols-[212px_1fr]">
        <Skeleton className="hidden h-80 rounded-lg lg:block" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}
