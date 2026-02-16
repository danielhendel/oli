// lib/dev/firebaseProbe.ts
import Constants from "expo-constants";
import { getAuthInstance } from "../firebaseConfig";
import { saveUserProfile } from "../db/profile";
import { ensureEmulatorAuth } from "./ensureEmuAuth";

export type ProbeResult = {
  status: "success" | "error";
  mode: "emulator" | "prod";
  message: string;
};

type Extra = { useEmulators?: boolean };

export async function runFirestoreProbe(): Promise<ProbeResult> {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const isEmu = !!extra.useEmulators;

  try {
    // Ensure we have a UID (sign in anonymously on emulator if needed)
    let uid = getAuthInstance().currentUser?.uid ?? "";
    if (isEmu) {
      const emuUid = await ensureEmulatorAuth(); // guarantees a signed-in user on emulator
      if (emuUid) uid = emuUid;
    }
    if (!uid) throw new Error("No UID available for probe");

    // Write to /users/{uid} (matches your rules)
    await saveUserProfile(uid, { name: "probe" });

    const msg = `Profile write OK (uid: ${uid})`;
    // helpful console line so you can see it even if UI doesn’t render
    console.log("[Probe] success:", msg);
    return { status: "success", mode: isEmu ? "emulator" : "prod", message: msg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[Probe] error:", msg);
    return { status: "error", mode: isEmu ? "emulator" : "prod", message: msg };
  }
}

