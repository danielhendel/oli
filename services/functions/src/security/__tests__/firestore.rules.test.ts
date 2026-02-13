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

  it("allows an authenticated user to read their own docs (raw + derived)", async () => {
    const uid = "user_a";
    const day = "2026-01-01";

    await testEnv.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
      const db = ctx.firestore();
      await db.doc(`users/${uid}/dailyFacts/${day}`).set({ userId: uid, date: day });
      await db.doc(`users/${uid}/intelligenceContext/${day}`).set({ userId: uid, day });
      await db.doc(`users/${uid}/insights/ins_1`).set({ userId: uid, id: "ins_1" });
      await db.doc(`users/${uid}/rawEvents/re_1`).set({ userId: uid, id: "re_1" });
      await db.doc(`users/${uid}/events/ev_1`).set({ userId: uid, id: "ev_1" });
      await db.doc(`users/${uid}/healthScores/${day}`).set({ userId: uid, date: day });
    });

    const db = userDb({ uid });

    await assertSucceeds(db.doc(`users/${uid}/dailyFacts/${day}`).get());
    await assertSucceeds(db.doc(`users/${uid}/intelligenceContext/${day}`).get());
    await assertSucceeds(db.doc(`users/${uid}/insights/ins_1`).get());
    await assertSucceeds(db.doc(`users/${uid}/rawEvents/re_1`).get());
    await assertSucceeds(db.doc(`users/${uid}/events/ev_1`).get());
    await assertSucceeds(db.doc(`users/${uid}/healthScores/${day}`).get());
  });

  it("denies client writes to ingestion + derived truth (I-01 / I-04)", async () => {
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

    await assertFails(
      db.doc(`users/${uid}/intelligenceContext/${day}`).set({ userId: uid, day })
    );
    await assertFails(db.doc(`users/${uid}/intelligenceContext/${day}`).update({ any: "field" }));
    await assertFails(db.doc(`users/${uid}/intelligenceContext/${day}`).delete());

    await assertFails(db.doc(`users/${uid}/insights/ins_1`).set({ userId: uid, id: "ins_1" }));
    await assertFails(db.doc(`users/${uid}/insights/ins_1`).update({ any: "field" }));
    await assertFails(db.doc(`users/${uid}/insights/ins_1`).delete());

    // Derived truth — health scores (Phase 1.5 Sprint 1)
    await assertFails(db.doc(`users/${uid}/healthScores/2026-01-01`).set({ userId: uid, date: "2026-01-01" }));
    await assertFails(db.doc(`users/${uid}/healthScores/2026-01-01`).update({ any: "field" }));
    await assertFails(db.doc(`users/${uid}/healthScores/2026-01-01`).delete());
  });

  it("denies cross-user reads (user isolation)", async () => {
    const uidA = "user_a";
    const uidB = "user_b";
    const day = "2026-01-01";

    await testEnv.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
      const db = ctx.firestore();
      await db.doc(`users/${uidA}/dailyFacts/${day}`).set({ userId: uidA, date: day });
    });

    const dbB = userDb({ uid: uidB });
    await assertFails(dbB.doc(`users/${uidA}/dailyFacts/${day}`).get());
  });
});