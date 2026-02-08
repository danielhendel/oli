/** @jest-environment node */
/**
 * Phase 1 Lock #5 — E2E proof: "past views never change"
 *
 * Proves that once a derived-ledger run is created, re-fetching its snapshot
 * after new data and a new run (Run B) yields identical truth — Run A is immutable.
 *
 * Flow:
 * A) Create Run A (ingest weight 80 → recompute)
 * B) Fetch snapshot A, store fingerprint
 * C) Create Run B (ingest weight 81 → recompute)
 * D) Re-fetch snapshot for Run A → assert fingerprint unchanged
 * E) Fetch snapshot for Run B → assert weightKg is 81 (sanity)
 *
 * Requires FIRESTORE_EMULATOR_HOST. No sleeps. Dedicated userId + cleanup for determinism.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import express from "express";
import { initializeApp, getApps } from "firebase-admin/app";
import { recomputeDerivedTruthForDay } from "../../../../functions/src/pipeline/recomputeForDay";
import { derivedLedgerReplayResponseDtoSchema } from "@oli/contracts";
import type { DerivedLedgerReplayResponseDto } from "@oli/contracts";

let eventsRouter: express.Router;
let usersMeRouter: express.Router;
let db: import("firebase-admin/firestore").Firestore;
let userCollectionFn: (uid: string, name: string) => import("firebase-admin/firestore").CollectionReference;

const TEST_UID = "u_e2e_phase1_immutability";
const DAY_KEY = "2026-02-20";
const IDEMPOTENCY_A = "e2e-immut-a-2026-02-20";
const IDEMPOTENCY_B = "e2e-immut-b-2026-02-20";

function requireEmulator() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host || host.trim() === "") {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST must be set. Run: npm test (uses run-jest-with-firestore-emulator.mjs)"
    );
  }
}

/** Stable fingerprint for deep equality (no computedAt, no server timestamps) */
function snapshotFingerprint(data: DerivedLedgerReplayResponseDto): object {
  return {
    day: data.day,
    runId: data.runId,
    pipelineVersion: data.pipelineVersion,
    dailyFactsWeightKg: data.dailyFacts?.body?.weightKg,
    dailyFactsBodyFat: data.dailyFacts?.body?.bodyFatPercent,
    insightsCount: data.insights?.count ?? 0,
    insightsItemIds: (data.insights?.items ?? []).map((i) => i.id).sort(),
    hasIntelligenceContext: data.intelligenceContext != null,
  };
}

async function cleanupDerivedLedgerForDay() {
  const pointerRef = userCollectionFn(TEST_UID, "derivedLedger").doc(DAY_KEY);
  await db.recursiveDelete(pointerRef);
}

function buildTestApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.use((req, _res, next) => {
    (req as unknown as { uid?: string }).uid = TEST_UID;
    next();
  });

  app.use("/ingest", eventsRouter);
  app.use("/users/me", usersMeRouter);

  return app;
}

describe("Phase 1 E2E: replay immutability — past views never change", () => {
  beforeAll(() => {
    requireEmulator();
    if (getApps().length === 0) {
      initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-oli" });
    }
    eventsRouter = require("../events").default;
    usersMeRouter = require("../usersMe").default;
    const dbModule = require("../../db");
    db = dbModule.db;
    userCollectionFn = dbModule.userCollection;
  });

  afterAll(async () => {
    await cleanupDerivedLedgerForDay();
  });

  it("Run A snapshot is unchanged after Run B is created", async () => {
    await cleanupDerivedLedgerForDay();

    const app = buildTestApp();
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }
    const base = `http://127.0.0.1:${address.port}`;

    try {
      // A) Create Run A
      const ingestARes = await fetch(`${base}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": IDEMPOTENCY_A,
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "weight",
          observedAt: `${DAY_KEY}T14:30:00.000Z`,
          sourceId: "manual",
          timeZone: "America/New_York",
          payload: {
            time: `${DAY_KEY}T14:30:00.000Z`,
            timezone: "America/New_York",
            weightKg: 80,
          },
        }),
      });

      expect(ingestARes.status).toBe(202);

      await recomputeDerivedTruthForDay({
        db,
        userId: TEST_UID,
        dayKey: DAY_KEY,
        factOnlyBody: { weightKg: 80 },
        trigger: { type: "factOnly", rawEventId: IDEMPOTENCY_A },
      });

      const runsARes = await fetch(`${base}/users/me/derived-ledger/runs?day=${DAY_KEY}`);
      expect(runsARes.status).toBe(200);
      const runsABody = (await runsARes.json()) as { runs: { runId: string }[] };
      expect(runsABody.runs.length).toBeGreaterThanOrEqual(1);
      const runIdA = runsABody.runs[0]!.runId;

      // B) Fetch Snapshot A
      const snapshotARes = await fetch(
        `${base}/users/me/derived-ledger/snapshot?day=${DAY_KEY}&runId=${runIdA}`
      );
      expect(snapshotARes.status).toBe(200);
      const snapshotARaw = (await snapshotARes.json()) as unknown;
      const parsedA = derivedLedgerReplayResponseDtoSchema.safeParse(snapshotARaw);
      expect(parsedA.success).toBe(true);
      if (!parsedA.success) return;

      const snapshotA = parsedA.data;
      expect(snapshotA.dailyFacts?.body?.weightKg).toBe(80);

      const snapshotA_fingerprint = snapshotFingerprint(snapshotA);

      // C) Create Run B
      const ingestBRes = await fetch(`${base}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": IDEMPOTENCY_B,
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "weight",
          observedAt: `${DAY_KEY}T15:00:00.000Z`,
          sourceId: "manual",
          timeZone: "America/New_York",
          payload: {
            time: `${DAY_KEY}T15:00:00.000Z`,
            timezone: "America/New_York",
            weightKg: 81,
          },
        }),
      });

      expect(ingestBRes.status).toBe(202);

      await recomputeDerivedTruthForDay({
        db,
        userId: TEST_UID,
        dayKey: DAY_KEY,
        factOnlyBody: { weightKg: 81 },
        trigger: { type: "factOnly", rawEventId: IDEMPOTENCY_B },
      });

      const runsBRes = await fetch(`${base}/users/me/derived-ledger/runs?day=${DAY_KEY}`);
      expect(runsBRes.status).toBe(200);
      const runsBBody = (await runsBRes.json()) as { runs: { runId: string }[] };
      expect(runsBBody.runs.length).toBeGreaterThanOrEqual(2);
      const runIdB = runsBBody.runs[0]!.runId;
      expect(runIdB).not.toBe(runIdA);

      // D) Re-fetch Snapshot for Run A
      const snapshotA2Res = await fetch(
        `${base}/users/me/derived-ledger/snapshot?day=${DAY_KEY}&runId=${runIdA}`
      );
      expect(snapshotA2Res.status).toBe(200);
      const snapshotA2Raw = (await snapshotA2Res.json()) as unknown;
      const parsedA2 = derivedLedgerReplayResponseDtoSchema.safeParse(snapshotA2Raw);
      expect(parsedA2.success).toBe(true);
      if (!parsedA2.success) return;

      const snapshotA2_fingerprint = snapshotFingerprint(parsedA2.data);

      expect(snapshotA2_fingerprint).toEqual(snapshotA_fingerprint);

      // E) Sanity: Run B is different
      const snapshotBRes = await fetch(
        `${base}/users/me/derived-ledger/snapshot?day=${DAY_KEY}&runId=${runIdB}`
      );
      expect(snapshotBRes.status).toBe(200);
      const snapshotBRaw = (await snapshotBRes.json()) as unknown;
      const parsedB = derivedLedgerReplayResponseDtoSchema.safeParse(snapshotBRaw);
      expect(parsedB.success).toBe(true);
      if (!parsedB.success) return;

      expect(parsedB.data.dailyFacts?.body?.weightKg).toBe(81);
      expect(snapshotFingerprint(parsedB.data)).not.toEqual(snapshotA_fingerprint);
    } finally {
      server.close();
    }
  });
});
