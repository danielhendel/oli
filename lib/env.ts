// lib/env.ts
//
// Centralized environment handling.
// - Staging-only guardrail
// - Fail-fast required vars
// - Backward compatible getEnv() API
// - Compatible with exactOptionalPropertyTypes

export type AppEnvironment = "staging";

/** Returns undefined if missing or empty. */
function optionalEnv(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Validates a value at module load; use with static process.env.X so EAS Update inlines it. */
function requiredValue(name: string, value: string | undefined): string {
  const v = (value ?? "").trim();
  if (!v) {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n\n` +
        `This repo is staging-only. Add ${name} to your .env.* file (or EAS env) and restart Expo.`
    );
  }
  return v;
}

/**
 * Support both keys to avoid drift:
 * - EXPO_PUBLIC_ENVIRONMENT (preferred)
 * - EXPO_PUBLIC_APP_ENV (legacy/template)
 */
function readEnvironment(): string {
  return (
    optionalEnv("EXPO_PUBLIC_ENVIRONMENT") ??
    optionalEnv("EXPO_PUBLIC_APP_ENV") ??
    "staging"
  ).trim();
}

function assertStagingOnly(env: string): asserts env is AppEnvironment {
  if (env !== "staging") {
    throw new Error(
      `❌ Invalid environment. This repo is STAGING ONLY.\n\n` +
        `Set EXPO_PUBLIC_ENVIRONMENT=staging (preferred) or EXPO_PUBLIC_APP_ENV=staging.\n` +
        `Got: ${env}`
    );
  }
}

// ---- Resolve + validate environment ----

const environment = readEnvironment();
assertStagingOnly(environment);

// Required for app to function in staging (static reads so EAS Update inlines)
const backendBaseUrl = requiredValue(
  "EXPO_PUBLIC_BACKEND_BASE_URL",
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL
);

// Required Firebase Web App config (staging) (static reads so EAS Update inlines)
const firebaseApiKey = requiredValue(
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY
);
const firebaseAuthDomain = requiredValue(
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
);
const firebaseProjectId = requiredValue(
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
);
const firebaseStorageBucket = requiredValue(
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
);
const firebaseMessagingSenderId = requiredValue(
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
);
const firebaseAppId = requiredValue(
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  process.env.EXPO_PUBLIC_FIREBASE_APP_ID
);

// ---- Canonical Env object ----

export const Env: Readonly<{
  EXPO_PUBLIC_ENVIRONMENT: AppEnvironment;
  EXPO_PUBLIC_BACKEND_BASE_URL: string;

  EXPO_PUBLIC_FIREBASE_API_KEY: string;
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  EXPO_PUBLIC_FIREBASE_APP_ID: string;
}> = {
  EXPO_PUBLIC_ENVIRONMENT: environment,
  EXPO_PUBLIC_BACKEND_BASE_URL: backendBaseUrl,

  EXPO_PUBLIC_FIREBASE_API_KEY: firebaseApiKey,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseMessagingSenderId,
  EXPO_PUBLIC_FIREBASE_APP_ID: firebaseAppId
};

// ---- Back-compat API ----
// getEnv()            → full Env object
// getEnv("KEY")       → single optional string (raw read)

export function getEnv(): typeof Env;
export function getEnv(key: string): string | undefined;
export function getEnv(key?: string) {
  if (typeof key === "string") {
    return optionalEnv(key);
  }
  return Env;
}
