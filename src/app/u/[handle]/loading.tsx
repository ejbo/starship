import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <Skeleton className="-mx-4 h-44 rounded-none sm:-mx-6" />
      <div className="-mt-12 flex items-end gap-5">
        <Skeleton className="size-24 rounded-2xl" />
        <Skeleton className="mb-2 h-6 w-40" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
