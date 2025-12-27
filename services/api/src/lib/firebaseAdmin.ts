import { App, getApp, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin (API) — Cloud Run safe
 *
 * Requirements:
 * - NO import-time initialization that can throw
 * - NO hard requirement on GOOGLE_CLOUD_PROJECT
 * - Allow ADC to infer projectId in Cloud Run
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

  // Key: do NOT throw — Cloud Run ADC can infer projectId
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
    `[api] firebase-admin initialized` + (projectId ? ` projectId=${projectId}` : " projectId=<inferred>")
  );

  return _adminApp;
};

export const getDb = (): Firestore => {
  if (_db) return _db;
  const app = getAdminApp();
  _db = getFirestore(app);
  return _db;
};
