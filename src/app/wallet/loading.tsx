import { Skeleton } from "@/components/ui/skeleton";

export default function WalletLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Skeleton className="mb-5 h-7 w-24" />
      <Skeleton className="mb-8 h-28 rounded-lg" />
      <Skeleton className="mb-3 h-5 w-16" />
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-40 rounded-lg" />
    </main>
  );
}
