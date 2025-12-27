// lib/env.ts
/**
 * STAGING-ONLY environment validation.
 *
 * FAILS FAST with a clear error if required values are missing or invalid.
 */

export type Environment = "staging";

export type Env = Readonly<{
  EXPO_PUBLIC_ENVIRONMENT: Environment;
  EXPO_PUBLIC_BACKEND_BASE_URL: string;

  EXPO_PUBLIC_FIREBASE_API_KEY: string;
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  EXPO_PUBLIC_FIREBASE_APP_ID: string;

  // Optional sanity check (only present if configured)
  EXPO_PUBLIC_EXPECTED_FIREBASE_PROJECT_ID?: string;
}>;

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v || v.trim().length === 0) {
    throw new Error(`❌ Missing required env var: ${key}`);
  }
  return v.trim();
};

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, "");

const assertHttpsCloudRunUrl = (url: string): void => {
  if (!url.startsWith("https://")) {
    throw new Error(
      `❌ Invalid EXPO_PUBLIC_BACKEND_BASE_URL. Must start with https://\n\nGot: ${url}`
    );
  }
  const lowered = url.toLowerCase();
  if (lowered.includes("localhost") || lowered.includes("127.0.0.1")) {
    throw new Error(
      `❌ Invalid EXPO_PUBLIC_BACKEND_BASE_URL. Localhost is not allowed (staging-only).\n\nGot: ${url}`
    );
  }
};

let cached: Env | null = null;

export const getEnv = (): Env => {
  if (cached) return cached;

  const rawEnv = (process.env.EXPO_PUBLIC_ENVIRONMENT ?? "staging").trim();
  const EXPO_PUBLIC_ENVIRONMENT: Environment = rawEnv === "staging" ? "staging" : (() => {
    throw new Error(
      `❌ Invalid EXPO_PUBLIC_ENVIRONMENT. This repo is staging-only.\n\nAllowed: staging\nGot: ${rawEnv}`
    );
  })();

  const baseUrl = normalizeBaseUrl(requireEnv("EXPO_PUBLIC_BACKEND_BASE_URL"));
  assertHttpsCloudRunUrl(baseUrl);

  const expectedProjectIdRaw = process.env.EXPO_PUBLIC_EXPECTED_FIREBASE_PROJECT_ID;
  const expectedProjectId =
    expectedProjectIdRaw && expectedProjectIdRaw.trim().length > 0
      ? expectedProjectIdRaw.trim()
      : undefined;

  const env: Env = Object.freeze({
    EXPO_PUBLIC_ENVIRONMENT,
    EXPO_PUBLIC_BACKEND_BASE_URL: baseUrl,

    EXPO_PUBLIC_FIREBASE_API_KEY: requireEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: requireEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: requireEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: requireEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: requireEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    EXPO_PUBLIC_FIREBASE_APP_ID: requireEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),

    ...(expectedProjectId ? { EXPO_PUBLIC_EXPECTED_FIREBASE_PROJECT_ID: expectedProjectId } : {}),
  });

  if (
    env.EXPO_PUBLIC_EXPECTED_FIREBASE_PROJECT_ID &&
    env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== env.EXPO_PUBLIC_EXPECTED_FIREBASE_PROJECT_ID
  ) {
    throw new Error(
      `❌ Firebase project mismatch.\n\nExpected: ${env.EXPO_PUBLIC_EXPECTED_FIREBASE_PROJECT_ID}\nActual: ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}\n\nFix EXPO_PUBLIC_FIREBASE_PROJECT_ID.`
    );
  }

  cached = env;
  return env;
};
