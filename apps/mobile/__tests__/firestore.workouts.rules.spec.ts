/**
 * Firestore security rules test (workouts).
 * - Skips when emulator isn't running (plain `npm test`)
 * - Runs fully when invoked via: npm run test:rules
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>> | undefined;

// Detect emulator host/port from env var set by `firebase emulators:exec`
const emuHost = process.env.FIRESTORE_EMULATOR_HOST; // e.g. "127.0.0.1:8080"
const emulatorDetected = Boolean(emuHost);

beforeAll(async () => {
  if (!emulatorDetected) {
    console.warn(
      "[rules-test] FIRESTORE_EMULATOR_HOST not set. Skipping rules tests. " +
        "Run `npm run test:rules` to execute against the emulator."
    );
    return;
  }

  const [host, portStr] = emuHost!.split(":");
  const port = Number(portStr);

  const rulesPath = path.resolve(process.cwd(), "firestore.rules");
  const rules = fs.readFileSync(rulesPath, "utf8");

  testEnv = await initializeTestEnvironment({
    projectId: "demo-oli",
    firestore: { rules, host, port }
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

const itIf = emulatorDetected ? it : it.skip;

itIf("owner can write and read workout log", async () => {
  if (!testEnv) throw new Error("testEnv not initialized");
  const ctx = testEnv.authenticatedContext("alice");
  const db = ctx.firestore();
  const ref = db.doc("users/alice/logs/workouts/w1");
  await assertSucceeds(ref.set({ uid: "alice", name: "Test", date: new Date(), totalVolume: 0 }));
  await assertSucceeds(ref.get());
});

itIf("non-owner is denied", async () => {
  if (!testEnv) throw new Error("testEnv not initialized");
  const owner = testEnv.authenticatedContext("alice").firestore();
  await owner.doc("users/alice/logs/workouts/w2").set({ uid: "alice", name: "Test2", date: new Date() });

  const other = testEnv.authenticatedContext("bob").firestore();
  const ref = other.doc("users/alice/logs/workouts/w2");
  await assertFails(ref.get());
});
