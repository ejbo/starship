import { Anchor } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-mute sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Anchor className="size-4 text-aurora/60" />
          <span className="font-display tracking-widest">STARPORT</span>
          <span>· 星港 — AI 时代的一站式造物港口</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded border border-gold/30 bg-gold/10 px-2 py-0.5 font-display text-xs text-gold">
            PHASE 0 雏形
          </span>
          <span>路线图见 docs/superpowers/specs</span>
        </div>
      </div>
    </footer>
  );
}
