import { cn } from "@/lib/cn";

/** 骨架块：加载占位，柔和脉冲。 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-card-hi", className)} />;
}

/** 标题 + 一排卡片的骨架（商店横向行/网格通用） */
export function CardRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-28" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="capsule overflow-hidden">
            <Skeleton className="aspect-[16/9] rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
