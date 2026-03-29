/** Human-readable label for a calendar day key (local presentation). */
export function formatNutritionLogDayHeading(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
