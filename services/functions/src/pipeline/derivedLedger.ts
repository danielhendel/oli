// services/functions/src/pipeline/derivedLedger.ts

import crypto from "node:crypto";
import type { DocumentReference, Firestore, Timestamp } from "firebase-admin/firestore";

export type IsoDateTimeString = string;
export type YmdDateString = string;

type Trigger =
  | { type: "realtime"; name: "onCanonicalEventCreated"; eventId: string }
  | { type: "realtime"; name: "onRawEventCreated_factOnly"; eventId: string }
  | { type: "scheduled"; name: string; eventId: string };

type SnapshotKind = "dailyFacts" | "intelligenceContext";

type LedgerRunRecord = {
  schemaVersion: 1;
  runId: string;
  userId: string;
  date: YmdDateString;

  computedAt: IsoDateTimeString;
  pipelineVersion: number;

  trigger: Trigger;

  // “what was known” truth anchor for replay/debug
  latestCanonicalEventAt?: IsoDateTimeString;

  outputs: {
    hasDailyFacts: boolean;
    insightsCount: number;
    hasIntelligenceContext: boolean;
  };

  createdAt: Timestamp;
};

type SnapshotDoc<T> = {
  schemaVersion: 1;
  kind: string;
  hash: string;
  createdAt: Timestamp;
  data: T;
};

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const normalize = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v !== "object") return v;

    // arrays preserve order
    if (Array.isArray(v)) return v.map(normalize);

    const obj = v as Record<string, unknown>;
    if (seen.has(obj)) throw new Error("stableStringify: circular structure");
    seen.add(obj);

    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = normalize(obj[k]);
    }
    return out;
  };

  return JSON.stringify(normalize(value));
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function sanitizeDocId(id: string): string {
  // Firestore doc ids cannot contain "/" and should be reasonably short.
  return id.replace(/\//g, "_");
}

async function createOrAssertIdentical<T extends object>(ref: DocumentReference, doc: T): Promise<void> {
  await ref.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.create(ref, doc);
      return;
    }

    const existing = snap.data();
    const a = stableStringify(existing);
    const b = stableStringify(doc);

    if (a !== b) {
      throw new Error(
        `Derived ledger immutability violation: attempted to overwrite ${ref.path} with different content.`,
      );
    }
    // identical: no-op
  });
}

function tryGetString(obj: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Deterministic ledger run id builder for schedulers/retries.
 * (onSchedule ScheduledEvent does not provide a stable .id field.)
 */
export function makeLedgerRunIdFromSeed(prefix: string, seed: string): string {
  const h = sha256Hex(seed).slice(0, 32);
  return sanitizeDocId(`${prefix}_${h}`);
}

export async function writeDerivedLedgerRun(args: {
  db: Firestore;
  userId: string;
  date: YmdDateString;
  runId: string;

  computedAt: IsoDateTimeString;
  pipelineVersion: number;

  trigger: Trigger;

  // optional anchor
  latestCanonicalEventAt?: IsoDateTimeString;

  // snapshots (optional per job)
  dailyFacts?: object;
  intelligenceContext?: object;
  insights?: object[];
}): Promise<void> {
  const {
    db,
    userId,
    date,
    runId,
    computedAt,
    pipelineVersion,
    trigger,
    latestCanonicalEventAt,
    dailyFacts,
    intelligenceContext,
    insights,
  } = args;

  const userRef = db.collection("users").doc(userId);

  // Pointer doc (mutable) – allowed: this is "latest pointer", not historical truth.
  const dayPointerRef = userRef.collection("derivedLedger").doc(date);

  // Append-only run doc + snapshots
  const runRef = dayPointerRef.collection("runs").doc(runId);
  const snapshotsRef = runRef.collection("snapshots");

  const now = (await import("firebase-admin/firestore")).Timestamp.now();

  // NOTE: exactOptionalPropertyTypes=true → omit optional props when undefined
  const runRecord: LedgerRunRecord = {
    schemaVersion: 1,
    runId,
    userId,
    date,
    computedAt,
    pipelineVersion,
    trigger,
    ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
    outputs: {
      hasDailyFacts: Boolean(dailyFacts),
      insightsCount: Array.isArray(insights) ? insights.length : 0,
      hasIntelligenceContext: Boolean(intelligenceContext),
    },
    createdAt: now,
  };

  // 1) Run record (append-only)
  await createOrAssertIdentical(runRef, runRecord);

  // 2) Snapshots (append-only)
  const writeSnapshot = async (kind: SnapshotKind, data: object): Promise<void> => {
    const body = stableStringify(data);
    const hash = sha256Hex(body);
    const snapDoc: SnapshotDoc<object> = {
      schemaVersion: 1,
      kind,
      hash,
      createdAt: now,
      data,
    };
    await createOrAssertIdentical(snapshotsRef.doc(kind), snapDoc);
  };

  if (dailyFacts) await writeSnapshot("dailyFacts", dailyFacts);
  if (intelligenceContext) await writeSnapshot("intelligenceContext", intelligenceContext);

  if (Array.isArray(insights) && insights.length > 0) {
    const insightsCol = snapshotsRef.doc("insights").collection("items");
    for (const insight of insights) {
      const insightObj = insight as Record<string, unknown>;
      const insightId =
        tryGetString(insightObj, "id") ?? sha256Hex(stableStringify(insightObj)).slice(0, 24);

      const body = stableStringify(insightObj);
      const hash = sha256Hex(body);

      const snapDoc: SnapshotDoc<Record<string, unknown>> = {
        schemaVersion: 1,
        kind: "insight",
        hash,
        createdAt: now,
        data: insightObj,
      };

      await createOrAssertIdentical(insightsCol.doc(sanitizeDocId(insightId)), snapDoc);
    }
  }

  // 3) Update pointer doc (mutable “latest” pointer) — authoritative overwrite (NO merge)
  await dayPointerRef.set({
    schemaVersion: 1,
    userId,
    date,
    latestRunId: runId,
    latestComputedAt: computedAt,
    pipelineVersion,
    trigger,
    updatedAt: now,
  });
}