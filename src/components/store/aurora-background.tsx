"use client";

import { useEffect, useRef } from "react";

// 品牌色相（RGB）：靛蓝 / 紫 / 蓝 / 青 / 一点品红做提亮
const HUES: [number, number, number][] = [
  [99, 102, 241],
  [124, 92, 214],
  [37, 99, 235],
  [16, 152, 173],
  [217, 70, 160],
];

/**
 * Canvas 动态背景：深空底 + 缓慢漂移的极光光团（叠加发光）+ 闪烁星点。
 * 作为首发横幅的「动态视频」级背景，自包含、无外部素材；尊重 prefers-reduced-motion。
 */
export function AuroraBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const rand = () => Math.random();
    const blobs = HUES.map((hue) => ({
      hue,
      bx: rand(),
      by: rand(),
      ax: 0.16 + rand() * 0.14,
      ay: 0.12 + rand() * 0.12,
      px: rand() * Math.PI * 2,
      py: rand() * Math.PI * 2,
      sx: 0.04 + rand() * 0.05,
      sy: 0.035 + rand() * 0.05,
      r: 0.42 + rand() * 0.26,
    }));
    const stars = Array.from({ length: 140 }, () => ({
      x: rand(),
      y: rand(),
      r: rand() * 1.4 + 0.3,
      tw: rand() * Math.PI * 2,
      ts: 0.6 + rand() * 1.8,
      drift: 0.0015 + rand() * 0.004,
    }));

    let raf = 0;
    const draw = (t: number) => {
      const time = t / 1000;

      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, "#080d29");
      base.addColorStop(0.5, "#0c1242");
      base.addColorStop(1, "#190d38");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const cx = (b.bx + Math.sin(time * b.sx + b.px) * b.ax) * w;
        const cy = (b.by + Math.cos(time * b.sy + b.py) * b.ay) * h;
        const rad = b.r * Math.max(w, h) * 0.62;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const [rr, gg, bb] = b.hue;
        g.addColorStop(0, `rgba(${rr},${gg},${bb},0.5)`);
        g.addColorStop(0.5, `rgba(${rr},${gg},${bb},0.16)`);
        g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      for (const s of stars) {
        const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(time * s.ts + s.tw));
        const sx = s.x * w;
        const sy = ((s.y + time * s.drift) % 1) * h;
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
