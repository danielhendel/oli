#!/usr/bin/env node
/**
 * Inspect raw events for a UID (Oura sourceId) for Oura snapshot debugging.
 * Run from services/api: node scripts/oura-inspect-raw-events.mjs <UID>
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login
 *            FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT (e.g. oli-staging-fdbba)
 */
import admin from "firebase-admin";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/oura-inspect-raw-events.mjs <UID>");
  process.exit(1);
}

const projectId =
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
  process.env.GCLOUD_PROJECT?.trim();

if (!projectId) {
  console.error("Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT");
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const col = db.collection("users").doc(uid).collection("rawEvents");

async function main() {
  const snap = await col.get();
  const oura = snap.docs.filter((d) => (d.data().sourceId || "") === "oura");
  const byKind = {};
  oura.forEach((d) => {
    const k = d.data().kind || "?";
    byKind[k] = (byKind[k] || 0) + 1;
  });

  console.log("--- Raw event counts (sourceId === 'oura') ---");
  console.log(JSON.stringify(byKind, null, 2));
  console.log("\n--- kind === 'sleep' exists ---");
  console.log(byKind.sleep > 0 ? "yes" : "no");
  console.log("\n--- kind === 'hrv' exists ---");
  console.log(byKind.hrv > 0 ? "yes" : "no");

  const sorted = oura.sort((a, b) => {
    const at = a.data().receivedAt || a.data().observedAt || "";
    const bt = b.data().receivedAt || b.data().observedAt || "";
    return bt.localeCompare(at);
  });
  const latest5 = sorted.slice(0, 5).map((d) => {
    const data = d.data();
    return {
      id: d.id,
      kind: data.kind,
      observedAt: data.observedAt ?? null,
      receivedAt: data.receivedAt ?? null,
    };
  });
  console.log("\n--- Latest 5 Oura raw events (id, kind, observedAt, receivedAt) ---");
  console.log(JSON.stringify(latest5, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
