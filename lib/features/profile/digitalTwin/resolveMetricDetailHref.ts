// lib/features/profile/digitalTwin/resolveMetricDetailHref.ts
// Pure metric → route resolution. In the current IA scaffold every metric row navigates to the
// blank profile metric detail page. An explicit module href may still be supplied to override.
// Never returns a route that does not exist in the app router.

/** Profile metric detail route (always exists; renders the blank placeholder for now). */
export function profileMetricFallbackHref(metricId: string): string {
  return `/(app)/profile/metric/${encodeURIComponent(metricId)}`;
}

/**
 * Resolve a metric id to a navigable href.
 * 1. Prefer an explicit module href when provided by the caller.
 * 2. Otherwise navigate to the profile metric detail page.
 */
export function resolveMetricDetailHref(
  metricId: string,
  explicitModuleHref?: string,
): string {
  if (explicitModuleHref && explicitModuleHref.length > 0) return explicitModuleHref;
  return profileMetricFallbackHref(metricId);
}

/** No metric currently resolves to a dedicated module route in the scaffold. */
export function metricHasModuleRoute(): boolean {
  return false;
}
