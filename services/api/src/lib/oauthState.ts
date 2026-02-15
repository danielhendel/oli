/**
 * OAuth state — create-only, single-use, expire.
 * State param format: {uid}:{stateId} so callback can resolve uid and look up under users/{uid}/oauthStates/{stateId}.
 */

import { createHash, randomBytes } from "node:crypto";
import { FieldValue, userCollection } from "../db";

const PURPOSE = "withings_oauth";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function createStateAsync(
  uid: string,
): Promise<{ stateId: string; stateForRedirect: string }> {
  const stateId = randomBytes(16).toString("hex");
  const stateForRedirect = `${uid}:${stateId}`;
  const stateHash = createHash("sha256").update(stateForRedirect).digest("hex");
  const now = Date.now();
  const ref = userCollection(uid, "oauthStates").doc(stateId);
  await ref.set({
    purpose: PURPOSE,
    stateHash,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(now + STATE_TTL_MS),
    usedAt: null,
  });
  return { stateId, stateForRedirect };
}

export type ValidateStateResult =
  | { ok: true; uid: string; stateId: string }
  | { ok: false; reason: string };

/**
 * Validate state from callback query and consume (mark used). Returns uid and stateId if valid.
 */
export async function validateAndConsumeState(stateFromCallback: string): Promise<ValidateStateResult> {
  if (!stateFromCallback || typeof stateFromCallback !== "string") {
    return { ok: false, reason: "missing_state" };
  }
  const parts = stateFromCallback.trim().split(":");
  if (parts.length !== 2) return { ok: false, reason: "invalid_state_format" };
  const [uid, stateId] = parts;
  if (!uid || !stateId) return { ok: false, reason: "invalid_state_format" };

  const ref = userCollection(uid, "oauthStates").doc(stateId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: "state_not_found" };

  const data = snap.data() as {
    purpose?: string;
    stateHash?: string;
    expiresAt?: FirebaseFirestore.Timestamp | Date;
    usedAt?: FirebaseFirestore.Timestamp | Date | null;
  } | undefined;
  if (!data) return { ok: false, reason: "state_not_found" };

  if (data.purpose !== PURPOSE) return { ok: false, reason: "invalid_purpose" };
  const expectedHash = createHash("sha256").update(stateFromCallback).digest("hex");
  if (data.stateHash !== expectedHash) return { ok: false, reason: "state_hash_mismatch" };

  const expiresAt = data.expiresAt instanceof Date ? data.expiresAt.getTime() : (data.expiresAt as FirebaseFirestore.Timestamp)?.toMillis?.() ?? 0;
  if (Date.now() > expiresAt) return { ok: false, reason: "state_expired" };

  if (data.usedAt != null) return { ok: false, reason: "state_already_used" };

  await ref.update({ usedAt: FieldValue.serverTimestamp() });
  return { ok: true, uid, stateId };
}
