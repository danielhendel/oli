import { App, applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin (API) — Cloud Run safe
 *
 * Goals:
 * - No import-time initialization that can throw
 * - No hard requirement on GOOGLE_CLOUD_PROJECT
 * - Allow ADC to infer projectId in Cloud Run
 * - Avoid noisy logs during tests (and allow opt-out via env)
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
      const pid = typeof parsed.projectId === "string" ? parsed.projectId.trim() : "";
      if (pid) return pid;
    } catch {
      // ignore malformed FIREBASE_CONFIG
    }
  }

  // Key: do NOT throw — Cloud Run ADC can infer projectId
  return undefined;
};

const shouldLog = (): boolean => {
  // Default: log once on boot in Cloud Run / local dev
  // Never log in tests; allow explicit opt-out in prod
  if (process.env.NODE_ENV === "test") return false;
  const raw = (process.env.OLI_ADMIN_LOG || "").trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
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

  if (shouldLog()) {
    console.log(
      `[api] firebase-admin initialized` + (projectId ? ` projectId=${projectId}` : " projectId=<inferred>")
    );
  }

  return _adminApp;
};

export const getDb = (): Firestore => {
  if (_db) return _db;
  const app = getAdminApp();
  _db = getFirestore(app);
  return _db;
};
