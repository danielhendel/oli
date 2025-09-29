import { App, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Use Application Default Credentials (works locally via gcloud and in Cloud Run)
let app: App;
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApp();
}

export const db = getFirestore(app);
