// lib/dev/firebaseProbe.ts
import Constants from "expo-constants";
import { getDb } from "../firebaseConfig";
import { collection, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

type Mode = "staging" | "disabled";
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
  return typeof v === "string" && v.trim().length > 0;
}

function isPlaceholder(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s.includes("your_") || s.includes("<") || s.includes("changeme");
}

function readConfig(): { firebase: FirebaseCfg; hasConfig: boolean } {
  const expoExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fbRaw = (expoExtra.firebase ?? {}) as Record<string, unknown>;

  const firebase: FirebaseCfg = {};
  if (typeof fbRaw.apiKey === "string") firebase.apiKey = fbRaw.apiKey;
  if (typeof fbRaw.authDomain === "string") firebase.authDomain = fbRaw.authDomain;
  if (typeof fbRaw.projectId === "string") firebase.projectId = fbRaw.projectId;
  if (typeof fbRaw.storageBucket === "string") firebase.storageBucket = fbRaw.storageBucket;
  if (typeof fbRaw.messagingSenderId === "string") firebase.messagingSenderId = fbRaw.messagingSenderId;
  if (typeof fbRaw.appId === "string") firebase.appId = fbRaw.appId;

  const parts = [firebase.apiKey, firebase.authDomain, firebase.projectId];
  const hasConfig = parts.every((p) => isNonEmptyString(p)) && !parts.some((p) => isPlaceholder(p as string));

  return { firebase, hasConfig };
}

export async function runFirestoreProbe(): Promise<ProbeResult> {
  const cfg = readConfig();
  if (!cfg.hasConfig) {
    return { status: "skipped", mode: "disabled", message: "Firebase config missing/placeholder." };
  }

  try {
    const db = getDb();
    const col = collection(db, "_healthChecks");
    const ref = doc(col, "probe");
    await setDoc(ref, { ok: true, ts: serverTimestamp() }, { merge: true });
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { status: "error", mode: "staging", message: "Probe write succeeded but read returned empty." };
    }

    return { status: "success", mode: "staging", message: "Firestore staging probe OK." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { status: "error", mode: "staging", message: msg };
  }
}
