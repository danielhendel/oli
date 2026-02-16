// app.config.ts
import type { ExpoConfig } from "expo/config";

const APP_ENV = process.env.APP_ENV ?? "dev"; // dev | preview | prod
const isDev = APP_ENV === "dev";

/** Firebase env → config (allows dummy non-empty values in dev/emulator) */
function resolveFirebase() {
  const useEmulators = isDev;

  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? (useEmulators ? "dev" : "");
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? (useEmulators ? "dev" : "");
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? (useEmulators ? "dev" : "");
  const storageBucket =
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? (useEmulators ? "dev" : "");
  const messagingSenderId =
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? (useEmulators ? "dev" : "");
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? (useEmulators ? "dev" : "");

  if (
    !isDev &&
    (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId)
  ) {
    throw new Error("[app.config] Firebase env incomplete for non-dev build");
  }

  return {
    useEmulators,
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

const fb = resolveFirebase();

/**
 * Google iOS client ID → reversed scheme Google expects for native redirect:
 * com.googleusercontent.apps.<CLIENT_ID_WITHOUT_SUFFIX>
 */
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
const iosReverseClientId = iosClientId.endsWith(".apps.googleusercontent.com")
  ? `com.googleusercontent.apps.${iosClientId.replace(".apps.googleusercontent.com", "")}`
  : "";

/**
 * Schemes:
 * - Keep your app scheme "oli" for general deep links.
 * - Add the Google reversed-client-id so iOS can route back from Google OAuth.
 * If iosReverseClientId is blank (env not set), we still provide "oli" so dev builds run.
 */
const schemes: string[] = ["oli"];
if (iosReverseClientId) schemes.push(iosReverseClientId);

const config: ExpoConfig = {
  name: "oli",
  slug: "oli",

  // Multiple schemes supported in SDK 53
  scheme: schemes,

  ios: {
    supportsTablet: true,
    usesAppleSignIn: true,
    // Must match the iOS app you added in Firebase
    bundleIdentifier: "com.healthos.oli",

    // Ensure the plist is copied during prebuild
    googleServicesFile: "GoogleService-Info.plist",
  },

  android: {
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    // Must match the Android app you added in Firebase (when you add Android)
    package: "com.healthos.oli",

    // Ensure the google-services.json is copied during prebuild
    googleServicesFile: "google-services.json",
  },

  plugins: [
    "expo-router",
    "expo-apple-authentication",
    // SDK 53 iOS config + dynamic frameworks for Firebase pods
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.1",
          useFrameworks: "dynamic",
        },
      },
    ],
    // React Native Firebase native init
    "@react-native-firebase/app",
  ],

  extra: {
    // Emulators in dev; the app computes host per platform at runtime
    useEmulators: fb.useEmulators,
    emulatorHost: "127.0.0.1",
    firestoreEmulatorPort: 8081,

    // Monitoring
    sentryDsn: isDev ? "" : process.env.SENTRY_DSN ?? "",

    // Backend
    backendBaseUrl: isDev ? "http://localhost:8080" : process.env.BACKEND_BASE_URL ?? "",

    // MVP-only shared secret (dev only; use Firebase ID tokens in prod)
    adminSecret: isDev ? "dev" : "",

    // Generic app deep link (kept for non-Google flows)
    authRedirectUri: "oli://auth-redirect",

    // Firebase config exposed to JS (web-style; native SDKs use plist/json above)
    firebase: {
      apiKey: fb.apiKey,
      authDomain: fb.authDomain,
      projectId: fb.projectId,
      storageBucket: fb.storageBucket,
      messagingSenderId: fb.messagingSenderId,
      appId: fb.appId,
    },

    // Google Auth client IDs (set via .env.local)
    google: {
      expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? "",
      iosClientId: iosClientId,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
    },
  },

  experiments: {
    typedRoutes: true,
  },
};

export default config;
