/** Compact label for Overview card header, e.g. "As of 3/27" (month/day, no weekday). */
export function formatOverviewAsOfLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `As of ${month}/${day}`;
}
