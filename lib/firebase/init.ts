// lib/firebase/init.ts
import firebase from "@react-native-firebase/app";
import Constants from "expo-constants";

/**
 * Types for the Expo `extra.firebase` block we set in app.config.ts
 */
type FirebaseExtra = {
  appId: string;
  apiKey: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

type ExtraRoot = {
  firebase?: Partial<FirebaseExtra>;
};

/**
 * Read firebase config that app.config.ts put into Constants.expoConfig.extra
 * (during dev this always exists; in prod you’ll provide real values).
 */
const extra = (Constants?.expoConfig?.extra ?? {}) as ExtraRoot;
const fb = extra.firebase ?? {};

/**
 * Initialize the default app exactly once. We build the options object
 * without undefined fields to satisfy TypeScript + RNFB.
 */
if (firebase.apps.length === 0) {
  const { appId, apiKey, projectId, storageBucket, messagingSenderId } = fb;

  if (!appId || !apiKey || !projectId) {
    // In dev, app.config.ts supplies placeholder strings; in non-dev you must
    // provide real values via env. We silently skip init if incomplete.
  } else {
    const options: {
      appId: string;
      apiKey: string;
      projectId: string;
      storageBucket?: string;
      messagingSenderId?: string;
    } = { appId, apiKey, projectId };

    if (storageBucket) options.storageBucket = storageBucket;
    if (messagingSenderId) options.messagingSenderId = messagingSenderId;

    firebase.initializeApp(options);
  }
}

/**
 * No exports needed — this module is imported for its side-effect in app/_layout.tsx:
 *   import "@/lib/firebase/init";
 */
