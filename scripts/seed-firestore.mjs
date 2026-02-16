/* eslint-env node */
// Usage:
//   export PROJECT_ID="oli-backend"
//   node scripts/seed-firestore.mjs <USER_UID>
// Requires: gcloud ADC (gcloud auth application-default login)

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const projectId = process.env.PROJECT_ID || "oli-backend";
const uid = process.argv[2];

if (!uid) {
  console.error(
    "ERROR: missing <USER_UID>.\nUsage: node scripts/seed-firestore.mjs <USER_UID>"
  );
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

// Helpers
const ymd = (d = new Date()) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;

async function upsertProfile() {
  const ref = db.doc(`users/${uid}`);
  const payload = {
    uid,
    name: "Oli Test User",
    preferences: { units: "metric", timezone: "America/New_York", shareData: false },
    goals: { primaryGoal: "Recomp", weeklyWorkoutFrequency: 4 },
    integrations: {
      oura: { status: "disconnected" },
      withings: { status: "disconnected" },
    },
    updatedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
  };
  await ref.set(payload, { merge: true });
  return ref.path;
}

async function writeSampleEvent() {
  const ref = db.collection(`users/${uid}/events`).doc();
  const today = ymd();
  const event = {
    uid,
    type: "workout",
    ymd: today,
    version: 1,
    source: "manual",
    ts: Timestamp.now(),
    payload: {
      name: "Push A (Seed)",
      focusAreas: ["chest", "triceps"],
      durationMin: 40,
      exercises: [
        { name: "Flat Barbell Bench", sets: [{ reps: 10, weight: 60 }, { reps: 8, weight: 70 }] },
        { name: "Cable Fly", sets: [{ reps: 15, weight: 12 }] },
      ],
      notes: "Seed script sample",
    },
  };
  await ref.set(event);
  return ref.path;
}

async function upsertDailyFact() {
  const day = ymd();
  const id = `daily.summary.v1:${day}`;
  const ref = db.doc(`users/${uid}/facts/${id}`);
  const fact = {
    uid,
    kind: "daily.summary.v1",
    date: day,
    value: {
      workouts: 1,
      cardioSessions: 0,
      nutritionLogs: 0,
      recoveryLogs: 0,
    },
    version: 1,
    source: "derived",
    ts: Timestamp.now(),
  };
  await ref.set(fact, { merge: true });
  return ref.path;
}

(async () => {
  console.log(`Seeding Firestore (project=${projectId}, uid=${uid})…`);
  const profilePath = await upsertProfile();
  console.log("✔ profile upserted:", profilePath);

  const eventPath = await writeSampleEvent();
  console.log("✔ event written:", eventPath);

  const factPath = await upsertDailyFact();
  console.log("✔ fact upserted:", factPath);

  console.log("✅ Seed complete.");
  process.exit(0);
})().catch((err) => {
  console.error("Seed failed:", err?.message || err);
  process.exit(1);
});
