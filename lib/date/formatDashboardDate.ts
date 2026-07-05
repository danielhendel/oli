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

/** Dash hero date line with Today prefix, e.g. "Today Sunday, July 5". */
export function formatTodayDashboardDate(date: Date, locale?: string): string {
  return `Today ${formatDashboardDate(date, locale)}`;
}
