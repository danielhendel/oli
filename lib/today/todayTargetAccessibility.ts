import type { TodayTargetProgress } from "@/lib/today/types";

/** VoiceOver label for a Today target row — percent + optional secondary context. */
export function todayTargetAccessibilityLabel(row: TodayTargetProgress): string {
  const openAction = row.routeTarget ? `Open ${row.label}` : row.label;

  if (row.status === "missing" && !row.includeInCompletion) {
    const base = `${row.label}, ${row.displayValue}`;
    const secondary = row.secondaryLine ? `. ${row.secondaryLine}` : "";
    return `${base}${secondary}. ${openAction}`;
  }

  if (row.status === "missing") {
    return `${row.label}, ${row.displayValue}. ${openAction}`;
  }

  const pct = Math.round(Math.min(1, Math.max(0, row.progress)) * 100);
  const parts = [`${row.label}, ${row.displayValue}, ${pct} percent complete`];
  if (row.secondaryLine) parts.push(row.secondaryLine);
  parts.push(openAction);
  return parts.join(". ");
}
