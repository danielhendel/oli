// services/functions/src/ingestion/rawEventDedupe.ts

import { createHash } from "crypto";
import * as logger from "firebase-functions/logger";
import { admin, db } from "../firebaseAdmin";
import { stableStringify } from "./stableJson";
import { parseRawEventContract } from "../validation/rawEvent";

type ContractRawEvent = Extract<
  ReturnType<typeof parseRawEventContract>,
  { ok: true }
>["data"];

type DedupeIndexDoc = {
  dedupeId: string;
  firstRawEventId: string;
  provider: string;
  sourceType: string;
  sourceId: string;
  kind: ContractRawEvent["kind"];
  observedAt: string;
  payloadHash: string;
  createdAt: admin.firestore.FieldValue;
};

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function computePayloadHash(raw: ContractRawEvent): string {
  // Phase 1: file payload includes sha256 of stored bytes — use that directly.
  if (raw.kind === "file") {
    const p = raw.payload as { sha256: string };
    return p.sha256;
  }
  // Deterministic hash of validated payload object
  return sha256Hex(stableStringify(raw.payload));
}

function computeDedupeId(raw: ContractRawEvent, payloadHash: string): string {
  // Tight tuple: provider + sourceType + sourceId + kind + observedAt + payloadHash
  return sha256Hex(
    [
      raw.provider,
      raw.sourceType,
      raw.sourceId,
      raw.kind,
      raw.observedAt,
      payloadHash,
    ].join("|"),
  );
}

export async function upsertRawEventDedupeEvidence(params: {
  userId: string;
  rawEvent: unknown; // accept unknown and validate contract-first inside
}): Promise<
  | { ok: true; mode: "first_seen"; dedupeId: string; payloadHash: string }
  | {
      ok: true;
      mode: "duplicate";
      dedupeId: string;
      payloadHash: string;
      firstRawEventId: string;
      integrityViolationPath: string;
    }
  | { ok: false; reason: "INVALID_RAW_EVENT_CONTRACT" }
> {
  const { userId, rawEvent } = params;

  const parsed = parseRawEventContract(rawEvent);
  if (!parsed.ok) {
    // Do not throw; caller decides whether to drop/log. We just signal invalid.
    return { ok: false, reason: "INVALID_RAW_EVENT_CONTRACT" } as const;
  }

  const evt = parsed.data;

  const payloadHash = computePayloadHash(evt);
  const dedupeId = computeDedupeId(evt, payloadHash);

  const dedupeRef = db
    .collection("users")
    .doc(userId)
    .collection("ingestionDedupe")
    .doc(dedupeId);

  const integrityRef = db
    .collection("users")
    .doc(userId)
    .collection("integrityViolations")
    .doc();

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(dedupeRef);

    if (!existing.exists) {
      const doc: DedupeIndexDoc = {
        dedupeId,
        firstRawEventId: evt.id,
        provider: evt.provider,
        sourceType: evt.sourceType,
        sourceId: evt.sourceId,
        kind: evt.kind,
        observedAt: evt.observedAt,
        payloadHash,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      tx.create(dedupeRef, doc);
      return { ok: true, mode: "first_seen", dedupeId, payloadHash } as const;
    }

    const firstRawEventId =
      (existing.data() as { firstRawEventId?: string }).firstRawEventId ??
      "UNKNOWN";

    tx.create(integrityRef, {
      type: "RAW_EVENT_DUPLICATE" as const,
      userId,
      dedupeId,
      firstRawEventId,
      duplicateRawEventId: evt.id,
      provider: evt.provider,
      sourceType: evt.sourceType,
      sourceId: evt.sourceId,
      kind: evt.kind,
      observedAt: evt.observedAt,
      payloadHash,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.warn("RawEvent duplicate detected (semantic duplicate tuple + payloadHash)", {
      userId,
      dedupeId,
      firstRawEventId,
      duplicateRawEventId: evt.id,
      provider: evt.provider,
      sourceType: evt.sourceType,
      sourceId: evt.sourceId,
      kind: evt.kind,
      observedAt: evt.observedAt,
      payloadHash,
      integrityViolationPath: integrityRef.path,
    });

    return {
      ok: true,
      mode: "duplicate",
      dedupeId,
      payloadHash,
      firstRawEventId,
      integrityViolationPath: integrityRef.path,
    } as const;
  });
}