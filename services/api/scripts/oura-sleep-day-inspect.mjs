#!/usr/bin/env node
/**
 * Inspect Oura sleep data for a specific UID + day (YYYY-MM-DD).
 *
 * This prints:
 * - The matching users/{uid}/ouraVendorSleep snapshot(s) for that day
 * - The matching users/{uid}/rawEvents docs with sourceId === "oura" and kind === "sleep"
 *   whose observedAt starts with that day (UTC)
 *
 * Usage (from services/api):
 *   FIREBASE_PROJECT_ID=oli-staging-fdbba node scripts/oura-sleep-day-inspect.mjs <UID> <DAY>
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`
 *   - FIREBASE_PROJECT_ID / GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT
 */

import admin from "firebase-admin";

const uid = process.argv[2];
const day = process.argv[3];

if (!uid || !day) {
  console.error("Usage: node scripts/oura-sleep-day-inspect.mjs <UID> <YYYY-MM-DD>");
  process.exit(1);
}

const projectId =
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
  process.env.GCLOUD_PROJECT?.trim();

if (!projectId) {
  console.error("Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT");
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

async function main() {
  console.log("UID:", uid);
  console.log("Day:", day);
  console.log("Project:", projectId);
  console.log("");

  // ----- Snapshot: users/{uid}/ouraVendorSleep -----
  const sleepCol = db.collection("users").doc(uid).collection("ouraVendorSleep");
  const snap = await sleepCol.where("day", "==", day).get();

  console.log("## ouraVendorSleep snapshot(s) for day");
  if (snap.empty) {
    console.log("(none)");
  } else {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log("```json");
    console.log(
      JSON.stringify(
        docs.map((d) => ({
          id: d.id,
          day: d.day,
          score: d.score ?? null,
          composite_score: d.composite_score ?? null,
          contributors: d.contributors ?? null,
          totalSleepDuration: d.totalSleepDuration ?? null,
          efficiency: d.efficiency ?? null,
          latency: d.latency ?? null,
          restfulSleep: d.restfulSleep ?? null,
          remSleep: d.remSleep ?? null,
          deepSleep: d.deepSleep ?? null,
        })),
        null,
        2,
      ),
    );
    console.log("```");
  }

  // ----- Raw events: users/{uid}/rawEvents (sourceId: oura, kind: sleep, observedAt on day) -----
  const rawCol = db.collection("users").doc(uid).collection("rawEvents");
  const rawSnap = await rawCol
    .where("sourceId", "==", "oura")
    .where("kind", "==", "sleep")
    .get();

  const rawForDay = rawSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => typeof d.observedAt === "string" && d.observedAt.startsWith(day));

  console.log("");
  console.log("## rawEvents (sourceId=oura, kind=sleep) for day");
  if (!rawForDay.length) {
    console.log("(none)");
  } else {
    console.log("```json");
    console.log(
      JSON.stringify(
        rawForDay.map((d) => ({
          id: d.id,
          observedAt: d.observedAt ?? null,
          receivedAt: d.receivedAt ?? null,
          // Oura v2/v3 payload nesting can vary; include both shallow and nested payload.
          score: d.payload?.score ?? d.score ?? null,
          composite_score: d.payload?.composite_score ?? d.composite_score ?? null,
          contributors: d.payload?.contributors ?? d.contributors ?? null,
          restful_sleep: d.payload?.restful_sleep ?? d.restful_sleep ?? null,
          restfulness: d.payload?.restfulness ?? d.restfulness ?? null,
          total_sleep_duration: d.payload?.total_sleep_duration ?? d.total_sleep_duration ?? null,
          efficiency: d.payload?.efficiency ?? d.efficiency ?? null,
          latency: d.payload?.latency ?? d.latency ?? null,
          rem_sleep_duration: d.payload?.rem_sleep_duration ?? d.rem_sleep_duration ?? null,
          deep_sleep_duration: d.payload?.deep_sleep_duration ?? d.deep_sleep_duration ?? null,
        })),
        null,
        2,
      ),
    );
    console.log("```");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

