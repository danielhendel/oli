#!/usr/bin/env node
/**
 * Oura backfill truth audit for a UID.
 * Reads Firestore: integration doc + ouraVendorSleep + ouraVendorReadiness.
 * Optionally runs gcloud logging read for Oura backfill/fetch/snapshot logs.
 *
 * Usage: node scripts/oura-backfill-truth-audit.mjs <UID> [PROJECT_ID]
 *   PROJECT_ID defaults to GOOGLE_CLOUD_PROJECT / FIREBASE_PROJECT_ID.
 *   Set RUN_LOGS=1 to run gcloud (requires gcloud and project).
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login
 */
import { execSync } from "child_process";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/oura-backfill-truth-audit.mjs <UID> [PROJECT_ID]");
  process.exit(1);
}

const projectId =
  process.argv[3]?.trim() ||
  process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  process.env.GCLOUD_PROJECT?.trim();

if (!projectId) {
  console.error("Set PROJECT_ID as second arg or GOOGLE_CLOUD_PROJECT / FIREBASE_PROJECT_ID");
  process.exit(1);
}

async function firestoreAudit() {
  const admin = await import("firebase-admin");
  if (admin.default.apps.length === 0) {
    admin.default.initializeApp({ projectId });
  }
  const db = admin.default.firestore();

  const out = {
    integration: null,
    ouraVendorSleep: { exists: false, total: 0, latest5ByDay: [] },
    ouraVendorReadiness: { exists: false, total: 0, latest5ByDay: [] },
    rawEventsOura: { sleep: { total: 0, latestReceivedAt: null }, hrv: { total: 0, latestReceivedAt: null } },
  };

  const integrationRef = db.doc(`users/${uid}/integrations/oura`);
  const integrationSnap = await integrationRef.get();
  if (integrationSnap.exists) {
    const d = integrationSnap.data();
    const toIso = (v) => {
      if (v == null) return null;
      if (typeof v === "string") return v;
      if (v && typeof v.toDate === "function") return v.toDate().toISOString();
      return String(v);
    };
    out.integration = {
      connected: d.connected ?? null,
      lastRefreshAt: toIso(d.lastRefreshAt),
      lastSyncAt: toIso(d.lastSyncAt),
      lastSnapshotAt: toIso(d.lastSnapshotAt),
      backfillStatus: d.backfillStatus ?? null,
      backfillStartedAt: toIso(d.backfillStartedAt),
      backfillCompletedAt: toIso(d.backfillCompletedAt),
      backfillFailedAt: toIso(d.backfillFailedAt),
      lastBackfillError: d.lastBackfillError ?? null,
    };
  }

  const sleepCol = db.collection("users").doc(uid).collection("ouraVendorSleep");
  const sleepSnap = await sleepCol.get();
  out.ouraVendorSleep.exists = !sleepSnap.empty;
  out.ouraVendorSleep.total = sleepSnap.size;
  if (sleepSnap.size > 0) {
    const withDay = sleepSnap.docs.map((doc) => ({ id: doc.id, day: doc.data().day, ...doc.data() }));
    withDay.sort((a, b) => (b.day || "").localeCompare(a.day || ""));
    out.ouraVendorSleep.latest5ByDay = withDay.slice(0, 5).map((d) => ({
      id: d.id,
      day: d.day,
      score: d.score,
      fetchedAt: d.fetchedAt,
    }));
  }

  const readinessCol = db.collection("users").doc(uid).collection("ouraVendorReadiness");
  const readinessSnap = await readinessCol.get();
  out.ouraVendorReadiness.exists = !readinessSnap.empty;
  out.ouraVendorReadiness.total = readinessSnap.size;
  if (readinessSnap.size > 0) {
    const withDay = readinessSnap.docs.map((doc) => ({ id: doc.id, day: doc.data().day, ...doc.data() }));
    withDay.sort((a, b) => (b.day || "").localeCompare(a.day || ""));
    out.ouraVendorReadiness.latest5ByDay = withDay.slice(0, 5).map((d) => ({
      id: d.id,
      day: d.day,
      score: d.score,
      fetchedAt: d.fetchedAt,
    }));
  }

  const rawCol = db.collection("users").doc(uid).collection("rawEvents");
  const rawSnap = await rawCol.get();
  const ouraSleep = rawSnap.docs.filter((d) => d.data().sourceId === "oura" && d.data().kind === "sleep");
  const ouraHrv = rawSnap.docs.filter((d) => d.data().sourceId === "oura" && d.data().kind === "hrv");
  out.rawEventsOura.sleep.total = ouraSleep.length;
  out.rawEventsOura.hrv.total = ouraHrv.length;
  const toIso = (v) => (v == null ? null : typeof v === "string" ? v : v?.toDate?.()?.toISOString?.() ?? String(v));
  if (ouraSleep.length > 0) {
    const byReceived = ouraSleep.slice().sort((a, b) => (toIso(b.data().receivedAt) || "").localeCompare(toIso(a.data().receivedAt) || ""));
    out.rawEventsOura.sleep.latestReceivedAt = toIso(byReceived[0].data().receivedAt);
  }
  if (ouraHrv.length > 0) {
    const byReceived = ouraHrv.slice().sort((a, b) => (toIso(b.data().receivedAt) || "").localeCompare(toIso(a.data().receivedAt) || ""));
    out.rawEventsOura.hrv.latestReceivedAt = toIso(byReceived[0].data().receivedAt);
  }

  return out;
}

function runLogQueries(project, u) {
  const msgs = [
    "oura_backfill_started",
    "oura_backfill_completed",
    "oura_backfill_failed",
    "oura_backfill_chunk_done",
    "oura_backfill_chunk_error",
    "oura_fetch_counts",
    "oura_ingest_item_counts",
    "oura_raw_events_write_start",
    "oura_raw_events_write_done",
    "oura_vendor_snapshots_start",
    "oura_vendor_snapshots_done",
    "oura_metadata_write_start",
    "oura_metadata_write_done",
    "oura_vendor_sleep_snapshot_write_error",
    "oura_vendor_readiness_snapshot_write_error",
  ];
  const filter = msgs.map((m) => `jsonPayload.msg="${m}"`).join(" OR ");
  const query = `resource.type="cloud_run_revision" AND resource.labels.service_name="oli-api" AND jsonPayload.uid="${u}" AND (${filter})`;
  try {
    const cmd = `gcloud logging read '${query}' --project=${project} --limit=100 --format=json`;
    const raw = execSync(cmd, { encoding: "utf-8", maxBuffer: 2 * 1024 * 1024 });
    const entries = JSON.parse(raw);
    return entries.map((e) => ({
      timestamp: e.timestamp,
      msg: e.jsonPayload?.msg,
      ...e.jsonPayload,
    }));
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

async function main() {
  const firestoreResult = await firestoreAudit();

  console.log("# Oura Backfill Truth Audit");
  console.log("");
  console.log("UID:", uid);
  console.log("Project:", projectId);
  console.log("");
  console.log("## Integration state");
  if (firestoreResult.integration) {
    console.log("```json");
    console.log(JSON.stringify(firestoreResult.integration, null, 2));
    console.log("```");
  } else {
    console.log("Doc does not exist.");
  }
  console.log("");
  console.log("## Snapshot collections");
  console.log("- **ouraVendorSleep**: exists =", firestoreResult.ouraVendorSleep.exists, ", total =", firestoreResult.ouraVendorSleep.total);
  if (firestoreResult.ouraVendorSleep.latest5ByDay.length) {
    console.log("  Latest 5 by day:");
    console.log("  ```json");
    console.log("  " + JSON.stringify(firestoreResult.ouraVendorSleep.latest5ByDay, null, 2).split("\n").join("\n  "));
    console.log("  ```");
  }
  console.log("- **ouraVendorReadiness**: exists =", firestoreResult.ouraVendorReadiness.exists, ", total =", firestoreResult.ouraVendorReadiness.total);
  if (firestoreResult.ouraVendorReadiness.latest5ByDay.length) {
    console.log("  Latest 5 by day:");
    console.log("  ```json");
    console.log("  " + JSON.stringify(firestoreResult.ouraVendorReadiness.latest5ByDay, null, 2).split("\n").join("\n  "));
    console.log("  ```");
  }
  console.log("");
  console.log("## Raw events (Oura sleep / hrv)");
  console.log("- **sleep** (sourceId=oura, kind=sleep): total =", firestoreResult.rawEventsOura.sleep.total, ", latestReceivedAt =", firestoreResult.rawEventsOura.sleep.latestReceivedAt ?? "null");
  console.log("- **hrv** (sourceId=oura, kind=hrv): total =", firestoreResult.rawEventsOura.hrv.total, ", latestReceivedAt =", firestoreResult.rawEventsOura.hrv.latestReceivedAt ?? "null");
  console.log("");

  let logEntries = [];
  if (process.env.RUN_LOGS === "1") {
    console.log("## Matching logs");
    logEntries = runLogQueries(projectId, uid);
    if (Array.isArray(logEntries)) {
      logEntries.forEach((e) => {
        console.log("-", e.timestamp, e.msg || "", JSON.stringify(e));
      });
    } else {
      console.log("Log fetch error:", logEntries.error);
    }
  } else {
    console.log("## Matching logs");
    console.log("Run with RUN_LOGS=1 to fetch (requires gcloud and project access):");
    console.log("  RUN_LOGS=1 node scripts/oura-backfill-truth-audit.mjs " + uid + " " + projectId);
  }

  // Output JSON for programmatic use
  console.log("");
  console.log("--- JSON (integration + snapshots + rawEventsOura) ---");
  console.log(JSON.stringify({ integration: firestoreResult.integration, ouraVendorSleep: firestoreResult.ouraVendorSleep, ouraVendorReadiness: firestoreResult.ouraVendorReadiness, rawEventsOura: firestoreResult.rawEventsOura }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
