import admin from "firebase-admin";

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

admin.initializeApp({ projectId: "oli-staging-fdbba" });
const db = admin.firestore();

const userId = process.env.TARGET_UID ?? process.env.USER_ID ?? "u_test";
const dayKey = process.env.DAYKEY ?? process.env.DAY_KEY ?? "2026-01-15";

console.log("VERIFY:", { userId, dayKey, FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWithRetry(ref, attempts = 10, delayMs = 200) {
  for (let i = 0; i < attempts; i++) {
    const snap = await ref.get();
    if (snap.exists) return snap;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return ref.get();
}

const hsRef = db.doc(`users/${userId}/healthScores/${dayKey}`);
const ledgerPointerRef = db.doc(`users/${userId}/derivedLedger/${dayKey}`);

const hsSnap = await getWithRetry(hsRef);
console.log("healthScore exists:", hsSnap.exists);
if (hsSnap.exists) {
  const hs = hsSnap.data();
  console.log("healthScore.modelVersion:", hs?.modelVersion);
  console.log("healthScore.compositeScore:", hs?.compositeScore);
  console.log("healthScore.status:", hs?.status);
}

const pointerSnap = await getWithRetry(ledgerPointerRef);
console.log("ledger pointer exists:", pointerSnap.exists);
if (!pointerSnap.exists) process.exit(2);

const pointer = pointerSnap.data();
const runId = pointer?.latestRunId;
console.log("ledger latestRunId:", runId);
if (!runId) process.exit(3);

const runRef = db.doc(`users/${userId}/derivedLedger/${dayKey}/runs/${runId}`);
const runSnap = await getWithRetry(runRef);
console.log("ledger run exists:", runSnap.exists);
if (runSnap.exists) console.log("run.outputs:", runSnap.data()?.outputs);

const snapRef = db.doc(`users/${userId}/derivedLedger/${dayKey}/runs/${runId}/snapshots/healthScore`);
const snapSnap = await getWithRetry(snapRef);
console.log("healthScore snapshot exists:", snapSnap.exists);
if (snapSnap.exists) console.log("snapshot.kind:", snapSnap.data()?.kind);
