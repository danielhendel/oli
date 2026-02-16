// lib/logging/saveDraft.ts
// Centralized draft saver for logging screens.
// Accepts either a raw payload or an event envelope { type, version, payload }.
// Avoids tight compile-time coupling with schema variants; callers keep strict typing.

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuthInstance, getDb } from "../firebaseConfig";
import { toYMD } from "@/lib/util/date"; // YMD helper used across hubs
import type { ValidationIssue, AnyPayload } from "./schemas";

export type DraftKind = "workout" | "cardio" | "nutrition" | "recovery";

type EnvelopeAny = {
  type: DraftKind;
  version: 1;
  payload: unknown;
};

function extractPayload(input: unknown): unknown {
  if (input && typeof input === "object" && "payload" in (input as Record<string, unknown>)) {
    return (input as EnvelopeAny).payload;
  }
  return input;
}

/**
 * Save a draft log for the current user:
 *   users/{uid}/events/{autoId}
 *
 * `data` can be either:
 *  - the raw payload for the kind (e.g., { modality: 'run', ... })
 *  - or an envelope: { type: 'cardio', version: 1, payload: {...} }
 *
 * Writes required day-indexed fields:
 *  - ymd  (YYYY-MM-DD) for queries & UI rings
 *  - atMs (epoch ms)   fallback timestamp for selectors
 */
export async function saveDraft(kind: DraftKind, data: unknown): Promise<void> {
  const auth = getAuthInstance();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const payload = extractPayload(data);
  const db = getDb();

  const now = new Date();
  const ymd = toYMD(now);
  const atMs = now.getTime();

  await addDoc(collection(db, "users", uid, "events"), {
    uid,
    type: kind,
    payload,
    // Required & expected by readers/rules
    ymd,                 // YYYY-MM-DD day key
    atMs,                // numeric timestamp
    version: 1,
    source: "manual",
    ts: serverTimestamp(),        // keep original server timestamp
    createdAt: serverTimestamp(), // optional: useful for audits
    updatedAt: serverTimestamp(),
  });
}

/**
 * Lightweight validator shim used by saveLog.ts.
 * Later, replace with real zod parsing per kind and return issues when invalid.
 */
export function validateOnly(
  _kind: DraftKind,
  draft: unknown
): { ok: true; data: AnyPayload } | { ok: false; issues: ValidationIssue[] } {
  const data = extractPayload(draft) as AnyPayload;
  return { ok: true, data };
}
