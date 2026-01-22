#!/usr/bin/env node
import crypto from "node:crypto";
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "oli-staging-fdbba",
});
const db = admin.firestore();

const uid = process.env.USER_ID || "1Uwhcp4OShV3QLz3VKMHWo5B3033";
const days = (process.env.DAYS || "2025-01-01,2025-01-02")
  .split(",").map(s => s.trim()).filter(Boolean);

const VOLATILE_PATHS = new Set([
  "computedAt",
  "meta.computedAt",
]);

function deepClone(x) {
  return x === undefined ? undefined : JSON.parse(JSON.stringify(x));
}

function deletePath(obj, path) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur || typeof cur !== "object") return;
    cur = cur[k];
  }
  if (cur && typeof cur === "object") delete cur[parts[parts.length - 1]];
}

function normalize(doc) {
  const x = deepClone(doc);
  if (!x || typeof x !== "object") return x;

  // drop known volatile fields
  for (const p of VOLATILE_PATHS) deletePath(x, p);

  // ALSO normalize meta.source if it contains counters (optional; uncomment if hashes still differ)
  // if (x.meta && typeof x.meta === "object" && x.meta.source && typeof x.meta.source === "object") {
  //   // Example: if you want to ignore dynamic counters like eventsForDay
  //   // delete x.meta.source;
  // }

  return x;
}

function stableStringify(obj) {
  const seen = new WeakSet();
  const sorter = (v) => {
    if (v && typeof v === "object") {
      if (seen.has(v)) return v;
      seen.add(v);
      if (Array.isArray(v)) return v.map(sorter);
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sorter(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sorter(obj));
}
function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function fetchDay(day) {
  const dailyFactsRef = db.doc(`users/${uid}/dailyFacts/${day}`);
  const intelRef = db.doc(`users/${uid}/intelligenceContext/${day}`);
  const insightsSnap = await db.collection(`users/${uid}/insights`).where("date","==",day).get();

  const dailyFactsRaw = (await dailyFactsRef.get()).data() || null;
  const intelRaw = (await intelRef.get()).data() || null;

  const insightsRaw = insightsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    day,
    dailyFacts: normalize(dailyFactsRaw),
    intelligenceContext: normalize(intelRaw),
    insights: insightsRaw.map(normalize),
  };
}

(async () => {
  const snapshot = {};
  for (const day of days) snapshot[day] = await fetchDay(day);

  const text = stableStringify({ uid, days, snapshot });
  const hash = sha256(text);

  console.log(JSON.stringify({
    uid,
    days,
    hash,
    capturedAt: new Date().toISOString(),
    volatileIgnored: Array.from(VOLATILE_PATHS),
    snapshot,
  }, null, 2));
})();
