import type { TodayProgressCardRow } from "@/lib/today/buildTodayProgressCardRows";

/** VoiceOver label for a Today’s Progress card row. */
export function todayProgressCardAccessibilityLabel(row: TodayProgressCardRow): string {
  return `${row.label}, ${row.displayValue}. Open ${row.label}.`;
}
