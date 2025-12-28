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

/** Throws if missing or empty. */
function requiredEnv(key: string): string {
  const v = optionalEnv(key);
  if (!v) {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n\n` +
        `This repo is staging-only. Add ${key} to your .env.* file (or EAS env) and restart Expo.`
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

// Required for app to function in staging
const backendBaseUrl = requiredEnv("EXPO_PUBLIC_BACKEND_BASE_URL");

// Required Firebase Web App config (staging)
const firebaseApiKey = requiredEnv("EXPO_PUBLIC_FIREBASE_API_KEY");
const firebaseAuthDomain = requiredEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN");
const firebaseProjectId = requiredEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID");
const firebaseStorageBucket = requiredEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET");
const firebaseMessagingSenderId = requiredEnv(
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
);
const firebaseAppId = requiredEnv("EXPO_PUBLIC_FIREBASE_APP_ID");

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
