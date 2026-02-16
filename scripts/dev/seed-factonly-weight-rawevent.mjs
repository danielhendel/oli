import admin from "firebase-admin";

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

admin.initializeApp({ projectId: "oli-staging-fdbba" });
const db = admin.firestore();

const userId = process.env.TARGET_UID ?? "u_test";
const rawEventId = process.env.RAW_EVENT_ID ?? `seed_weight_${Date.now()}`;
const observedAt = process.env.OBSERVED_AT ?? "2026-01-15T12:00:00.000Z";
const timeZone = process.env.TIME_ZONE ?? "America/New_York";

// Fact-only payload shape required by extractFactOnlyContext() in onRawEventCreated.ts
const payload = {
  time: observedAt,       // must be string
  timezone: timeZone,     // must be string
  weightKg: 82.5,         // must be > 0 number
  bodyFatPercent: 18,     // optional
};

const doc = {
  schemaVersion: 1,
  id: rawEventId,
  userId,
  sourceId: "withings_scale",
  sourceType: "manual",
  provider: "manual",
  kind: "weight",
  receivedAt: new Date().toISOString(),
  observedAt,
  // IMPORTANT: onRawEventCreated.deriveDayFromRaw requires top-level timeZone
  timeZone,
  payload,
};

const ref = db.doc(`users/${userId}/rawEvents/${rawEventId}`);
await ref.set(doc);

console.log("Wrote RawEvent:", ref.path);
console.log("RawEvent.kind:", doc.kind);
console.log("RawEvent.observedAt:", doc.observedAt);
console.log("RawEvent.timeZone:", doc.timeZone);
