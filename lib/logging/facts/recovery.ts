import type { RecoveryPayload } from "../schemas";

export function sleepTotals(p: RecoveryPayload): { totalMin?: number } {
  if (p.sleep?.totalMin !== undefined) return { totalMin: Math.max(0, p.sleep.totalMin) };
  if (p.sleep?.stages && p.sleep.stages.length) {
    let ms = 0;
    for (const s of p.sleep.stages) {
      const start = Date.parse(s.start);
      const end = Date.parse(s.end);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        ms += end - start;
      }
    }
    const min = Math.round(ms / 60000);
    if (min > 0) return { totalMin: min };
  }
  return {};
}
