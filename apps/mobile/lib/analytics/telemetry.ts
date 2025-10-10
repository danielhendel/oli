// apps/mobile/lib/analytics/telemetry.ts
const isDev = process.env.NODE_ENV !== 'production';

/** Minimal telemetry shim — expand later with your analytics SDK. */
export function logEvent(name: string, params?: Record<string, unknown>): void {
  if (isDev) {
    console.log('[telemetry]', name, params ?? {});
  }
}
