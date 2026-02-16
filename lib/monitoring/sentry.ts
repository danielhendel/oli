// lib/monitoring/sentry.ts
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const extra = (Constants?.expoConfig as { extra?: { sentryDsn?: string } } | undefined)
    ?.extra;
  const dsn = extra?.sentryDsn;

  if (!dsn) {
    // No DSN configured (dev/test) → safely no-op.
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    enableNative: true,
    // Avoid __DEV__ (eslint no-undef). Use NODE_ENV instead.
    debug:
      typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production",
  });

  initialized = true;
}
