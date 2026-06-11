"use client";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { addWishlistAction, removeWishlistAction } from "@/app/wishlist/actions";
import { cn } from "@/lib/cn";

export function WishlistButton({ slug, initial, signedOut }: { slug: string; initial: boolean; signedOut?: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  if (signedOut) return null;

  return (
    <button
      onClick={() => {
        const v = !on;
        setOn(v);
        start(() => (v ? addWishlistAction(slug) : removeWishlistAction(slug)));
      }}
      disabled={pending}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors disabled:opacity-60",
        on ? "border-rose-300 bg-rose-50 text-rose-500" : "border-line text-dim hover:border-accent/40 hover:text-accent",
      )}
    >
      <Heart className={cn("size-4", on && "fill-current")} />
      {on ? "已在心愿单" : "加入心愿单"}
    </button>
  );
}
