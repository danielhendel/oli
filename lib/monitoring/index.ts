import Constants from "expo-constants";

type Ctx = Record<string, unknown>;

function readDsn(): string | undefined {
  const env = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (typeof env === "string" && env.trim().length > 0) return env.trim();

  // Also allow app.json > expo.extra.sentryDsn
  const c = Constants as unknown as {
    expoConfig?: { extra?: unknown };
    manifest?: { extra?: unknown };
  };
  const rawExtra = c.expoConfig?.extra ?? c.manifest?.extra ?? {};
  if (typeof rawExtra === "object" && rawExtra !== null) {
    const dsn = (rawExtra as Record<string, unknown>).sentryDsn;
    if (typeof dsn === "string" && dsn.trim().length > 0) return dsn.trim();
  }
  return undefined;
}

/** Init placeholder — logs status only (Sprint 0). */
export function initMonitoring(): void {
  const dsn = readDsn();
  if (dsn) {
    console.log("[monitoring] Sentry DSN detected (placeholder init).");
  } else {
    console.log("[monitoring] No DSN found. Monitoring disabled (Sprint 0).");
  }
}

/** Capture error placeholder — upgrade later to Sentry.captureException */
export function captureError(err: unknown, ctx?: Ctx): void {
  console.error("[monitoring] captureError (noop):", err, ctx);
}
