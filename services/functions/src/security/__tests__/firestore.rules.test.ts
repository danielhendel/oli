/**
 * @jest-environment node
 */

import fs from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const RULES_PATH = path.resolve(process.cwd(), "services/functions/firestore.rules");

type Authed = { uid: string };

describe("Firestore security rules (I-01 / I-04)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rules = fs.readFileSync(RULES_PATH, "utf8");
    testEnv = await initializeTestEnvironment({
      projectId: "oli-rules-test",
      firestore: { rules },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  const userDb = (auth: Authed) => testEnv.authenticatedContext(auth.uid).firestore();
  const unauthDb = () => testEnv.unauthenticatedContext().firestore();

  it("allows an authenticated user to read their own docs (raw + derived + sources + failures)", async () => {
    const uid = "user_a";
    const day = "2026-01-01";

    await testEnv.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
      const db = ctx.firestore();
      await db.doc(`users/${uid}/dailyFacts/${day}`).set({ userId: uid, date: day });
      await db.doc(`users/${uid}/intelligenceContext/${day}`).set({ userId: uid, day });
      await db.doc(`users/${uid}/insights/ins_1`).set({ userId: uid, id: "ins_1" });
      await db.doc(`users/${uid}/rawEvents/re_1`).set({ userId: uid, id: "re_1" });
      await db.doc(`users/${uid}/events/ev_1`).set({ userId: uid, id: "ev_1" });

      // Step 4: sources are readable but not writable by clients
      await db.doc(`users/${uid}/sources/src_1`).set({
        id: "src_1",
        userId: uid,
        provider: "manual",
        sourceType: "api",
        isActive: true,
        allowedKinds: ["sleep"],
        supportedSchemaVersions: [1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Step 8: failures are readable but not writable by clients
      await db.doc(`users/${uid}/failures/f_1`).set({
        userId: uid,
        type: "INGEST_REJECTED",
        code: "TIMEZONE_INVALID",
        message: "Timezone invalid.",
        day,
        createdAt: new Date().toISOString(),
      });
    });

    const db = userDb({ uid });

    await assertSucceeds(db.doc(`users/${uid}/dailyFacts/${day}`).get());
    await assertSucceeds(db.doc(`users/${uid}/intelligenceContext/${day}`).get());
    await assertSucceeds(db.doc(`users/${uid}/insights/ins_1`).get());
    await assertSucceeds(db.doc(`users/${uid}/rawEvents/re_1`).get());
    await assertSucceeds(db.doc(`users/${uid}/events/ev_1`).get());

    // Step 4: sources are readable
    await assertSucceeds(db.doc(`users/${uid}/sources/src_1`).get());

    // Step 8: failures are readable
    await assertSucceeds(db.doc(`users/${uid}/failures/f_1`).get());
  });

  it("denies unauthenticated reads to all user-scoped docs (including failures)", async () => {
    const uid = "user_a";
    const day = "2026-01-01";

    await testEnv.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
      const db = ctx.firestore();
      await db.doc(`users/${uid}/dailyFacts/${day}`).set({ userId: uid, date: day });
      await db.doc(`users/${uid}/rawEvents/re_1`).set({ userId: uid, id: "re_1" });
      await db.doc(`users/${uid}/events/ev_1`).set({ userId: uid, id: "ev_1" });
      await db.doc(`users/${uid}/sources/src_1`).set({ id: "src_1", userId: uid });
      await db.doc(`users/${uid}/failures/f_1`).set({
        userId: uid,
        type: "RAW_EVENT_INVALID",
        code: "RAW_EVENT_CONTRACT_INVALID",
        message: "Invalid RawEvent envelope; normalization dropped the event.",
        day,
        createdAt: new Date().toISOString(),
      });
    });

    const db = unauthDb();

    await assertFails(db.doc(`users/${uid}/dailyFacts/${day}`).get());
    await assertFails(db.doc(`users/${uid}/rawEvents/re_1`).get());
    await assertFails(db.doc(`users/${uid}/events/ev_1`).get());
    await assertFails(db.doc(`users/${uid}/sources/src_1`).get());
    await assertFails(db.doc(`users/${uid}/failures/f_1`).get());
  });

  it("denies client writes to ingestion + derived truth + sources + failures (I-01 / I-04)", async () => {
    const uid = "user_a";
    const day = "2026-01-01";
    const db = userDb({ uid });

    // Ingestion boundary
    await assertFails(db.doc(`users/${uid}/rawEvents/re_1`).set({ userId: uid, id: "re_1" }));
    await assertFails(db.doc(`users/${uid}/rawEvents/re_1`).update({ any: "field" }));
    await assertFails(db.doc(`users/${uid}/rawEvents/re_1`).delete());

    // Canonical truth
    await assertFails(db.doc(`users/${uid}/events/ev_1`).set({ userId: uid, id: "ev_1" }));
    await assertFails(db.doc(`users/${uid}/events/ev_1`).update({ any: "field" }));
    await assertFails(db.doc(`users/${uid}/events/ev_1`).delete());

    // Derived truth
    await assertFails(db.doc(`users/${uid}/dailyFacts/${day}`).set({ userId: uid, date: day }));
    await assertFails(db.doc(`users/${uid}/dailyFacts/${day}`).update({ any: "field" }));
    await assertFails(db.doc(`users/${uid}/dailyFacts/${day}`).delete());

    await assertFails(db.doc(`users/${uid}/intelligenceContext/${day}`).set({ userId: uid, day }));
    await assertFails(db.doc(`users/${uid}/intelligenceContext/${day}`).update({ any: "field" }));
    await assertFails(db.doc(`users/${uid}/intelligenceContext/${day}`).delete());

    await assertFails(db.doc(`users/${uid}/insights/ins_1`).set({ userId: uid, id: "ins_1" }));
    await assertFails(db.doc(`users/${uid}/insights/ins_1`).update({ any: "field" }));
    await assertFails(db.doc(`users/${uid}/insights/ins_1`).delete());

    // Step 4: sources are NOT writable by clients
    await assertFails(
      db.doc(`users/${uid}/sources/src_1`).set({
        id: "src_1",
        userId: uid,
        provider: "manual",
        sourceType: "api",
        isActive: true,
        allowedKinds: ["sleep"],
        supportedSchemaVersions: [1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
    await assertFails(db.doc(`users/${uid}/sources/src_1`).update({ isActive: false }));
    await assertFails(db.doc(`users/${uid}/sources/src_1`).delete());

    // Step 8: failures are NOT writable by clients
    await assertFails(
      db.doc(`users/${uid}/failures/f_1`).set({
        userId: uid,
        type: "INGEST_REJECTED",
        code: "TIMEZONE_INVALID",
        message: "Timezone invalid.",
        day,
        createdAt: new Date().toISOString(),
      }),
    );
    await assertFails(db.doc(`users/${uid}/failures/f_1`).update({ message: "nope" }));
    await assertFails(db.doc(`users/${uid}/failures/f_1`).delete());
  });

  it("denies cross-user reads (user isolation)", async () => {
    const uidA = "user_a";
    const uidB = "user_b";
    const day = "2026-01-01";

    await testEnv.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
      const db = ctx.firestore();
      await db.doc(`users/${uidA}/dailyFacts/${day}`).set({ userId: uidA, date: day });

      // Step 4: also seed a source doc for uidA
      await db.doc(`users/${uidA}/sources/src_1`).set({
        id: "src_1",
        userId: uidA,
        provider: "manual",
        sourceType: "api",
        isActive: true,
        allowedKinds: ["sleep"],
        supportedSchemaVersions: [1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Step 8: seed a failure doc for uidA
      await db.doc(`users/${uidA}/failures/f_1`).set({
        userId: uidA,
        type: "INGEST_REJECTED",
        code: "TIMEZONE_INVALID",
        message: "Timezone invalid.",
        day,
        createdAt: new Date().toISOString(),
      });
    });

    const dbB = userDb({ uid: uidB });

    // Existing invariant
    await assertFails(dbB.doc(`users/${uidA}/dailyFacts/${day}`).get());

    // Step 4 invariant: cannot read another user's sources
    await assertFails(dbB.doc(`users/${uidA}/sources/src_1`).get());

    // Step 8 invariant: cannot read another user's failures
    await assertFails(dbB.doc(`users/${uidA}/failures/f_1`).get());
  });
});
