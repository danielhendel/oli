/**
 * Dash hero date line — full weekday + month + day (locale-aware).
 */
export function formatDashboardDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
