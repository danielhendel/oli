const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatBodyDayLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const wd = WEEKDAY_SHORT[d.getUTCDay()] ?? "";
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${wd} ${month}/${day}`;
}

