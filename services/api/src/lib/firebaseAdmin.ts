// services/api/src/lib/firebaseAdmin.ts
import { App, getApp, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin (API)
 *
 * IMPORTANT:
 * Initialize the DEFAULT admin app (no name).
 * Many call sites use getAuth() / getFirestore() without passing an app,
 * which binds to the DEFAULT app. If we initialize a named app, those calls
 * won't see it and token verification will fail (401).
 */

const resolveProjectId = (): string => {
  const fromEnv = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (fromEnv) return fromEnv;

  const fc = process.env.FIREBASE_CONFIG;
  if (fc) {
    try {
      const parsed = JSON.parse(fc) as { projectId?: string };
      if (parsed.projectId) return parsed.projectId;
    } catch {
      // ignore
    }
  }

  throw new Error(
    "Missing project id for Firebase Admin. Set GOOGLE_CLOUD_PROJECT or GCLOUD_PROJECT (e.g. oli-staging-fdbba)."
  );
};

export const projectId = resolveProjectId();

let app: App;
if (getApps().length === 0) {
  app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });

  // eslint-disable-next-line no-console
  console.log(`[api] firebase-admin initialized DEFAULT app projectId=${projectId}`);
} else {
  app = getApp();
}

export const adminApp = app;
export const db = getFirestore(app);
