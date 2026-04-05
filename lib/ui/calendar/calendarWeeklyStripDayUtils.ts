const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function calendarStripDayOfWeekLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  return DAY_LABELS[d.getUTCDay()] ?? "";
}

export function calendarStripDayOfMonth(dayKey: string): string {
  return String(new Date(`${dayKey}T12:00:00.000Z`).getUTCDate());
}
