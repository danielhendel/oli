// lib/telemetry/initSentry.ts
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

type Extra = { sentryDsn?: string };

let initialized = false;

export function initSentryIfEnabled() {
  if (initialized) return;
  const extra = (Constants.expoConfig?.extra ?? {}) as unknown as Extra;
  const dsn = extra.sentryDsn;
  if (!dsn) return;
  Sentry.init({ dsn });
  initialized = true;
}
