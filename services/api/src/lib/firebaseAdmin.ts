import { App, getApp, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin (API)
 *
 * Goal:
 * - Always initialize the DEFAULT admin app (no name).
 * - Never crash at import-time if env hasn't loaded yet.
 * - Prefer explicit env vars locally, but allow GCP (Cloud Run) ADC defaults.
 *
 * IMPORTANT:
 * - Do NOT resolve project id at module load time.
 * - Resolve lazily when initializing.
 */

let _adminApp: App | null = null;
let _db: Firestore | null = null;

const tryResolveProjectId = (): string | undefined => {
  const fromEnv = (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "").trim();
  if (fromEnv) return fromEnv;

  const fc = (process.env.FIREBASE_CONFIG || "").trim();
  if (fc) {
    try {
      const parsed = JSON.parse(fc) as { projectId?: string };
      if (typeof parsed.projectId === "string" && parsed.projectId.trim()) return parsed.projectId.trim();
    } catch {
      // ignore malformed FIREBASE_CONFIG
    }
  }

  // Return undefined (do not throw) so ADC can infer project in GCP runtimes.
  return undefined;
};

export const getAdminApp = (): App => {
  if (_adminApp) return _adminApp;

  if (getApps().length > 0) {
    _adminApp = getApp(); // default app
    return _adminApp;
  }

  const projectId = tryResolveProjectId();

  _adminApp = initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });

  // eslint-disable-next-line no-console
  console.log(
    `[api] firebase-admin initialized DEFAULT app` +
      (projectId ? ` projectId=${projectId}` : " projectId=<inferred>")
  );

  return _adminApp;
};

export const getDb = (): Firestore => {
  if (_db) return _db;
  const app = getAdminApp();
  _db = getFirestore(app);
  return _db;
};

/**
 * Back-compat exports (if other files import { adminApp, db })
 * Keep these, but they will initialize lazily instead of at import time.
 */
export const adminApp: App = new Proxy({} as App, {
  get(_t, prop) {
    const app = getAdminApp();
    // @ts-expect-error - proxy passthrough
    return app[prop];
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_t, prop) {
    const firestore = getDb();
    // @ts-expect-error - proxy passthrough
    return firestore[prop];
  },
});
