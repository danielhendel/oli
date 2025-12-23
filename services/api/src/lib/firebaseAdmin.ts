/**
 * Firebase Admin (API)
 *
 * Option A (staging-first):
 * - Cloud Run uses real Firebase (staging/prod) via ADC
 * - Emulators are enabled ONLY when APP_ENV=local
 *
 * IMPORTANT:
 * We initialize the DEFAULT admin app (no name).
 * Many call sites use getAuth() / getFirestore() without passing an app.
 * Initializing a named app would break auth verification.
 */

import {
  App,
  getApp,
  getApps,
  initializeApp,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Resolve Firebase project ID robustly across environments.
 */
const resolveProjectId = (): string => {
  // Preferred: explicit GCP env vars
  const fromEnv =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (fromEnv) return fromEnv;

  // Fallback: FIREBASE_CONFIG (sometimes injected)
  const fc = process.env.FIREBASE_CONFIG;
  if (fc) {
    try {
      const parsed = JSON.parse(fc) as { projectId?: string };
      if (parsed.projectId) return parsed.projectId;
    } catch {
      // ignore malformed FIREBASE_CONFIG
    }
  }

  throw new Error(
    "Missing project id for Firebase Admin. Set GOOGLE_CLOUD_PROJECT or GCLOUD_PROJECT (e.g. oli-staging-fdbba)."
  );
};

export const projectId = resolveProjectId();

/**
 * Determine runtime environment.
 */
type AppEnv = "local" | "staging" | "production";

const readAppEnv = (): AppEnv => {
  const raw = (process.env.APP_ENV ?? "").trim().toLowerCase();
  if (raw === "local" || raw === "staging" || raw === "production") {
    return raw;
  }
  return "staging"; // safe default (Option A)
};

const APP_ENV: AppEnv = readAppEnv();

/**
 * Initialize the DEFAULT Firebase Admin app.
 */
let app: App;

if (getApps().length === 0) {
  app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });

  // eslint-disable-next-line no-console
  console.log(
    `[api] firebase-admin initialized DEFAULT app projectId=${projectId} APP_ENV=${APP_ENV}`
  );

  if (APP_ENV === "local") {
    // eslint-disable-next-line no-console
    console.log(
      `[api] firebase-admin using emulators: auth=${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "unset"} firestore=${process.env.FIRESTORE_EMULATOR_HOST ?? "unset"}`
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(
      "[api] firebase-admin using real Firebase (staging/production)"
    );
  }
} else {
  app = getApp();
}

export const adminApp = app;
export const db = getFirestore(app);
