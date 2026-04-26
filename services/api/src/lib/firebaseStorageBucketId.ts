/**
 * Default Firebase Storage bucket id for Admin SDK (`admin.storage().bucket(id)`).
 *
 * Prefer `FIREBASE_STORAGE_BUCKET` on Cloud Run so non-default buckets stay explicit.
 * When unset, derive `${projectId}.firebasestorage.app` from standard GCP project env vars
 * (matches `FIREBASE_CONFIG.storageBucket` for oli-staging-fdbba in repo IAM snapshots).
 * If your Firebase project still uses the legacy id, set `FIREBASE_STORAGE_BUCKET` explicitly
 * (e.g. `my-project.appspot.com`).
 */
export function requireFirebaseStorageBucketId(): string {
  const explicit = (process.env.FIREBASE_STORAGE_BUCKET ?? "").trim();
  if (explicit.length > 0) return explicit;

  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    "";

  if (projectId.length === 0) {
    throw new Error("Missing FIREBASE_STORAGE_BUCKET env var");
  }

  return `${projectId}.firebasestorage.app`;
}
