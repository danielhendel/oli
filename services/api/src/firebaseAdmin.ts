// services/api/src/firebaseAdmin.ts
import admin from "firebase-admin";

/**
 * Cloud Run: use Application Default Credentials (service account) automatically.
 * This must match the staging Firebase project (oli-staging-fdbba).
 *
 * If GOOGLE_CLOUD_PROJECT is set by Cloud Run, we use it.
 * Otherwise allow an explicit FIREBASE_PROJECT_ID.
 */
const projectId =
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
  process.env.GCLOUD_PROJECT?.trim() ||
  undefined;

if (admin.apps.length === 0) {
  admin.initializeApp(
    projectId
      ? {
          projectId,
        }
      : undefined
  );
}

export { admin };
