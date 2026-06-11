/** 使用时长（分钟）→ 人话："尚未使用" / "X 分钟" / "X 小时" / "X 小时 Y 分钟" */
export function formatPlaytime(minutes: number): string {
  if (!minutes || minutes < 1) return "尚未使用";
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
}

/** 紧凑版（卡片角标）："Xm" / "Xh" / "Xh Ym" */
export function formatPlaytimeShort(minutes: number): string {
  if (!minutes || minutes < 1) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
