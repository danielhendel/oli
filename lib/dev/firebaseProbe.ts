import Constants from "expo-constants";
import { getDb } from "../firebaseConfig";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

type Mode = "emulator" | "production" | "disabled";
export type ProbeResult = { status: "success" | "skipped" | "error"; mode: Mode; message: string };

type FirebaseCfg = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function isPlaceholder(v?: string) {
  return !!v && /^\$\{.+\}$/.test(v);
}

function getExtra(): { firebase: FirebaseCfg; useEmulators: boolean } {
  // Read extra from either expoConfig or legacy manifest; avoid `any`
  const c = Constants as unknown as {
    expoConfig?: { extra?: unknown };
    manifest?: { extra?: unknown };
  };
  const raw = c.expoConfig?.extra ?? c.manifest?.extra ?? {};
  const base: Record<string, unknown> =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const fbRaw =
    typeof base.firebase === "object" && base.firebase !== null
      ? (base.firebase as Record<string, unknown>)
      : {};

  const firebase: FirebaseCfg = {};
  if (typeof fbRaw.apiKey === "string") firebase.apiKey = fbRaw.apiKey;
  if (typeof fbRaw.authDomain === "string") firebase.authDomain = fbRaw.authDomain;
  if (typeof fbRaw.projectId === "string") firebase.projectId = fbRaw.projectId;
  if (typeof fbRaw.storageBucket === "string") firebase.storageBucket = fbRaw.storageBucket;
  if (typeof fbRaw.messagingSenderId === "string")
    firebase.messagingSenderId = fbRaw.messagingSenderId;
  if (typeof fbRaw.appId === "string") firebase.appId = fbRaw.appId;

  const useEmulators =
    base.useEmulators === true || process.env.EXPO_PUBLIC_USE_EMULATORS === "true";

  return { firebase, useEmulators };
}

function readFlags(): { hasConfig: boolean; useEmulators: boolean; mode: Mode } {
  const { firebase, useEmulators } = getExtra();

  const parts = [
    firebase.apiKey,
    firebase.authDomain,
    firebase.projectId,
    firebase.storageBucket,
    firebase.messagingSenderId,
    firebase.appId,
  ];
  const hasConfig =
    parts.every((p) => isNonEmptyString(p)) && !parts.some((p) => isPlaceholder(p as string));

  const mode: Mode = useEmulators ? "emulator" : hasConfig ? "production" : "disabled";
  return { hasConfig, useEmulators, mode };
}

export async function runFirestoreProbe(): Promise<ProbeResult> {
  const flags = readFlags();

  if (flags.mode === "disabled") {
    return {
      status: "skipped",
      mode: "disabled",
      message:
        "No Firebase config and emulators are disabled. Set EXPO_PUBLIC_* envs or enable useEmulators in app.json.",
    };
    }

  try {
    const db: Firestore = getDb();
    const col = collection(db, "__probes");
    const ref = doc(col); // random id
    await setDoc(ref, { note: "dev console probe", ts: serverTimestamp() });
    const snap = await getDoc(ref);
    return {
      status: "success",
      mode: flags.mode,
      message: `Wrote doc ${ref.id}; exists=${snap.exists()}`,
    };
  } catch (e) {
    const msg = (e as Error).message || String(e);
    return { status: "error", mode: flags.mode, message: msg };
  }
}
