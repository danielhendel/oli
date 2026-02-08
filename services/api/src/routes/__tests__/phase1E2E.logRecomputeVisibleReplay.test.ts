/** @jest-environment node */
/**
 * Sprint 6 — Phase 1 E2E proof: log → recompute → visible → replayable
 *
 * Proves the full pipeline:
 * 1) Ingest/log: POST /ingest with weight (same path as Sprint 0 proof)
 * 2) Recompute: run recomputeDerivedTruthForDay (emulator harness; no Firestore trigger in tests)
 * 3) Visible: dailyFacts present and non-empty
 * 4) Replayable: derived-ledger snapshot endpoint returns valid payload including the logged datum
 *
 * Runs with FIRESTORE_EMULATOR_HOST (run-jest-with-firestore-emulator.mjs).
 * Deterministic; fail-closed on missing docs.
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import express from "express";
import { initializeApp, getApps } from "firebase-admin/app";
import { recomputeDerivedTruthForDay } from "../../../../functions/src/pipeline/recomputeForDay";
import { derivedLedgerReplayResponseDtoSchema } from "@oli/contracts";

let eventsRouter: express.Router;
let usersMeRouter: express.Router;
let db: import("firebase-admin/firestore").Firestore;

const TEST_UID = "u_e2e_phase1_sprint6";
const DAY_KEY = "2026-01-15";
const IDEMPOTENCY_KEY = "e2e-phase1-sprint6-2026-01-15";

function requireEmulator() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host || host.trim() === "") {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST must be set. Run: npm test (uses run-jest-with-firestore-emulator.mjs)"
    );
  }
}

function buildTestApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Auth shim: set uid for all requests (bypass real auth in test)
  app.use((req, _res, next) => {
    (req as unknown as { uid?: string }).uid = TEST_UID;
    next();
  });

  app.use("/ingest", eventsRouter);
  app.use("/users/me", usersMeRouter);

  return app;
}

describe("Phase 1 E2E: log → recompute → visible → replayable", () => {
  beforeAll(() => {
    requireEmulator();
    if (getApps().length === 0) {
      initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-oli" });
    }
    eventsRouter = require("../events").default;
    usersMeRouter = require("../usersMe").default;
    db = require("../../db").db;
  });

  it("ingest → recompute → dailyFacts visible → snapshot replayable", async () => {
    const app = buildTestApp();
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }
    const base = `http://127.0.0.1:${address.port}`;

    try {
      // 1) Ingest/log
      const ingestRes = await fetch(`${base}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": IDEMPOTENCY_KEY,
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "weight",
          observedAt: "2026-01-15T14:30:00.000Z",
          sourceId: "manual",
          timeZone: "America/New_York",
          payload: {
            time: "2026-01-15T14:30:00.000Z",
            timezone: "America/New_York",
            weightKg: 80,
          },
        }),
      });

      expect(ingestRes.status).toBe(202);
      const ingestBody = (await ingestRes.json()) as unknown;
      expect(ingestBody).toMatchObject({
        ok: true,
        rawEventId: IDEMPOTENCY_KEY,
        day: DAY_KEY,
      });

      // 2) Recompute (Firestore trigger does not run in emulator; we invoke directly)
      await recomputeDerivedTruthForDay({
        db,
        userId: TEST_UID,
        dayKey: DAY_KEY,
        factOnlyBody: { weightKg: 80 },
        trigger: { type: "factOnly", rawEventId: IDEMPOTENCY_KEY },
      });

      // 3) Visible: dailyFacts exists
      const dailyFactsRes = await fetch(`${base}/users/me/daily-facts?day=${DAY_KEY}`);
      expect(dailyFactsRes.status).toBe(200);
      const dailyFacts = (await dailyFactsRes.json()) as unknown;
      expect(dailyFacts).toBeDefined();
      expect((dailyFacts as { body?: { weightKg?: number } }).body?.weightKg).toBe(80);

      // 4) Replayable: derived-ledger snapshot
      const snapshotRes = await fetch(`${base}/users/me/derived-ledger/snapshot?day=${DAY_KEY}`);
      expect(snapshotRes.status).toBe(200);
      const snapshot = (await snapshotRes.json()) as unknown;

      const parsed = derivedLedgerReplayResponseDtoSchema.safeParse(snapshot);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const data = parsed.data;
      expect(data.day).toBe(DAY_KEY);
      expect(data.runId).toBeDefined();
      expect(data.runId.length).toBeGreaterThan(0);
      expect(data.computedAt).toBeDefined();
      expect(data.pipelineVersion).toBeGreaterThan(0);

      // Snapshot must include the logged datum's effect
      expect(data.dailyFacts).toBeDefined();
      expect(data.dailyFacts?.body?.weightKg).toBe(80);

      // Non-empty derived content
      expect(data.dailyFacts || data.intelligenceContext || data.insights).toBeDefined();
    } finally {
      server.close();
    }
  });
});
