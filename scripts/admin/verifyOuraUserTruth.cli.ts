#!/usr/bin/env npx tsx
/**
 * Firestore admin: verify Oura → rawEvents → events → dailyFacts → vendor snapshots → sleepNights → sleep-night resolution.
 *
 * Usage (repo root, ADC or GOOGLE_APPLICATION_CREDENTIALS):
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/verifyOuraUserTruth.cli.ts \
 *     --project-id <firebaseProjectId> --uid <uid> --day 2026-05-11 [--window-days 2]
 *
 * Notes:
 * - Raw Oura rows use `sourceId: "oura"` and `provider: "manual"` (ingest schema).
 * - Readiness from Oura is stored as raw `kind: "hrv"`, not `readiness`.
 * - Vendor sleep `day` matches ingest rollup (Oura `day` field or wake UTC).
 *
 *   gcloud logging read 'jsonPayload.msg="[OURA_SLEEP_LATEST_AUDIT]" AND jsonPayload.uid="UID"' --project=PROJECT --limit=5
 *   gcloud logging read 'jsonPayload.msg="[OURA_SLEEP_SNAPSHOT_WRITE_AUDIT]" AND jsonPayload.uid="UID"' --project=PROJECT --limit=20
 *   gcloud logging read 'jsonPayload.msg="[SLEEP_NIGHT_READ_DEBUG]" AND jsonPayload.uid="UID"' --project=PROJECT --limit=10
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

function parseArgs(argv: string[]): { projectId: string; uid: string; day: string; windowDays: number } | "help" | "usage" {
  let projectId: string | null = null;
  let uid: string | null = null;
  let day: string | null = null;
  let windowDays = 2;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return "help";
    if (a === "--project-id") projectId = argv[++i]?.trim() ?? null;
    else if (a === "--uid") uid = argv[++i]?.trim() ?? null;
    else if (a === "--day") day = argv[++i]?.trim() ?? null;
    else if (a === "--window-days") windowDays = Math.max(0, Number.parseInt(argv[++i] ?? "2", 10) || 2);
  }
  if (!projectId || !uid || !day) return "usage";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "usage";
  return { projectId, uid, day, windowDays };
}

function printHelp(): void {
  console.log(`verifyOuraUserTruth.cli.ts — dump Firestore truth for Oura pipeline verification.

Required:
  --project-id <firebaseProjectId>
  --uid <userId>
  --day <YYYY-MM-DD>   anchor local/calendar day (UTC window expansion uses calendar math on this string)

Optional:
  --window-days <n>    include raw rows whose payload.day or observedAt day is within ±n of anchor (default 2)
`);
}

function ymdFromIso(iso: string): string | null {
  if (typeof iso !== "string" || iso.length < 10) return null;
  const head = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : null;
}

function dayMinus(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function dayPlus(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function inYmdWindow(ymd: string | null, anchor: string, windowDays: number): boolean {
  if (!ymd) return false;
  const lo = dayMinus(anchor, windowDays);
  const hi = dayPlus(anchor, windowDays);
  return ymd >= lo && ymd <= hi;
}

function sleepPhysiologyCandidateKeys(data: Record<string, unknown>): string[] {
  const keys = new Set<string>(Object.keys(data));
  const payload = data.payload;
  if (payload != null && typeof payload === "object" && !Array.isArray(payload)) {
    for (const k of Object.keys(payload as Record<string, unknown>)) {
      keys.add(`payload.${k}`);
    }
  }
  return [...keys]
    .filter((k) => /heart|hrv|hr_/i.test(k) || /lowest|average/i.test(k))
    .sort();
}

function serializeFirestoreValue(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      out[k] = serializeFirestoreValue(val);
    }
    return out;
  }
  if (Array.isArray(v)) return v.map(serializeFirestoreValue);
  return v;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed === "help") {
    printHelp();
    process.exit(0);
  }
  if (parsed === "usage") {
    printHelp();
    console.error("Missing or invalid --project-id / --uid / --day.");
    process.exit(1);
  }
  const { projectId, uid, day, windowDays } = parsed;

  if (!getApps().length) {
    initializeApp({ projectId });
  }
  const db = getFirestore();

  const userRef = db.collection("users").doc(uid);

  console.log("\n=== 1) integrations/oura ===\n");
  const integSnap = await userRef.collection("integrations").doc("oura").get();
  if (!integSnap.exists) {
    console.log("(no document)");
  } else {
    console.log(JSON.stringify(serializeFirestoreValue(integSnap.data()), null, 2));
  }

  const windowLo = dayMinus(day, windowDays);
  const windowHi = dayPlus(day, windowDays);
  console.log(`\n=== 2) rawEvents (sourceId==oura, kind sleep|hrv, window ${windowLo}..${windowHi} via payload.day or observedAt) ===\n`);

  const rawCol = userRef.collection("rawEvents");
  const [sleepSnap, hrvSnap] = await Promise.all([
    rawCol.where("kind", "==", "sleep").where("sourceId", "==", "oura").limit(120).get(),
    rawCol.where("kind", "==", "hrv").where("sourceId", "==", "oura").limit(120).get(),
  ]);

  type RawRow = {
    id: string;
    kind: string;
    provider?: unknown;
    sourceId?: unknown;
    observedAt?: unknown;
    receivedAt?: unknown;
    payloadDay?: unknown;
  };

  const rawRows: RawRow[] = [];
  for (const snap of [sleepSnap, hrvSnap]) {
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const payload = data.payload && typeof data.payload === "object" ? (data.payload as Record<string, unknown>) : {};
      const payloadDay = typeof payload.day === "string" ? payload.day : null;
      const obs = typeof data.observedAt === "string" ? data.observedAt : null;
      const obsDay = obs ? ymdFromIso(obs) : null;
      const matchDay = inYmdWindow(payloadDay, day, windowDays) || inYmdWindow(obsDay, day, windowDays);
      if (!matchDay) continue;
      rawRows.push({
        id: d.id,
        kind: String(data.kind ?? ""),
        provider: data.provider,
        sourceId: data.sourceId,
        observedAt: data.observedAt,
        receivedAt: data.receivedAt,
        payloadDay: payload.day,
      });
    }
  }
  rawRows.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
  console.log(JSON.stringify(rawRows, null, 2));
  console.log(`(matched ${rawRows.length} raw row(s) in ±${windowDays}d window)`);

  console.log(`\n=== 3) canonical events (day == ${day}, kind sleep|hrv) ===\n`);
  const eventsSnap = await userRef.collection("events").where("day", "==", day).get();
  const canonical = eventsSnap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      const k = data.kind;
      if (k !== "sleep" && k !== "hrv") return null;
      return {
        id: d.id,
        kind: k,
        day: data.day,
        timezone: data.timezone,
        start: data.start,
        end: data.end,
        time: data.time,
        sourceId: data.sourceId,
      };
    })
    .filter(Boolean);
  console.log(JSON.stringify(canonical, null, 2));

  console.log("\n=== 4) dailyFacts/" + day + " ===\n");
  const factsSnap = await userRef.collection("dailyFacts").doc(day).get();
  if (!factsSnap.exists) {
    console.log("(no document)");
  } else {
    const data = factsSnap.data() as Record<string, unknown>;
    const sleep = data.sleep && typeof data.sleep === "object" ? (data.sleep as Record<string, unknown>) : {};
    const recovery = data.recovery && typeof data.recovery === "object" ? (data.recovery as Record<string, unknown>) : {};
    const energy =
      data.energyInfluencers && typeof data.energyInfluencers === "object"
        ? (data.energyInfluencers as Record<string, unknown>)
        : {};
    const physiology =
      energy.physiology && typeof energy.physiology === "object" ? (energy.physiology as Record<string, unknown>) : {};
    const activity = data.activity && typeof data.activity === "object" ? (data.activity as Record<string, unknown>) : {};
    const slice = {
      sleep: {
        totalMinutes: sleep.totalMinutes,
        deepSleepMinutes: sleep.deepSleepMinutes,
        remSleepMinutes: sleep.remSleepMinutes,
        efficiency: sleep.efficiency,
      },
      recovery: {
        hrvRmssd: recovery.hrvRmssd,
        hrvRmssdBaseline: recovery.hrvRmssdBaseline,
        hrvRmssdDeviation: recovery.hrvRmssdDeviation,
      },
      energyInfluencers: {
        physiology: { restingHeartRateBpm: physiology.restingHeartRateBpm },
      },
      activity: { trainingLoad: activity.trainingLoad },
    };
    console.log(JSON.stringify(serializeFirestoreValue(slice), null, 2));
  }

  console.log("\n=== 5) Vendor snapshots (exact day " + day + ") ===\n");
  const [exactSleep, exactReadiness] = await Promise.all([
    userRef.collection("ouraVendorSleep").where("day", "==", day).limit(5).get(),
    userRef.collection("ouraVendorReadiness").where("day", "==", day).limit(5).get(),
  ]);
  console.log("ouraVendorSleep (day match):", exactSleep.size);
  for (const d of exactSleep.docs) {
    const data = d.data() as Record<string, unknown>;
    const payload =
      data.payload && typeof data.payload === "object" ? (data.payload as Record<string, unknown>) : null;
    console.log(
      JSON.stringify(
        {
          id: d.id,
          day: data.day,
          score: data.score,
          lowestHeartRateBpm: data.lowestHeartRateBpm,
          averageHrvMs: data.averageHrvMs,
          lowest_heart_rate: data.lowest_heart_rate,
          average_hrv: data.average_hrv,
          payloadLowestHeartRate: payload?.lowest_heart_rate ?? payload?.lowestHeartRateBpm,
          payloadAverageHrv: payload?.average_hrv ?? payload?.averageHrvMs,
          rawCandidateKeys: sleepPhysiologyCandidateKeys(data),
          fetchedAt: data.fetchedAt,
          updatedAt: data.updatedAt,
        },
        null,
        2,
      ),
    );
  }
  console.log("ouraVendorReadiness (day match):", exactReadiness.size);
  for (const d of exactReadiness.docs) {
    const data = d.data() as Record<string, unknown>;
    const payload =
      data.payload && typeof data.payload === "object" ? (data.payload as Record<string, unknown>) : null;
    const rawCandidateKeys = [
      ...Object.keys(data),
      ...(payload ? Object.keys(payload).map((k) => `payload.${k}`) : []),
    ].sort();
    console.log(
      JSON.stringify(
        {
          id: d.id,
          day: data.day,
          score: data.score,
          lowestHeartRateBpm: data.lowestHeartRateBpm,
          averageHrvMs: data.averageHrvMs,
          lowest_heart_rate: data.lowest_heart_rate,
          average_hrv: data.average_hrv,
          rmssd_5min: data.rmssd_5min,
          payloadLowestHeartRate: payload?.lowest_heart_rate ?? payload?.lowestHeartRateBpm,
          payloadAverageHrv: payload?.average_hrv ?? payload?.averageHrvMs ?? payload?.rmssd_5min,
          rawCandidateKeys,
          fetchedAt: data.fetchedAt,
          updatedAt: data.updatedAt,
        },
        null,
        2,
      ),
    );
  }

  const latestSleep = await userRef.collection("ouraVendorSleep").orderBy("day", "desc").limit(5).get();
  console.log("\nLatest ouraVendorSleep docs by field 'day' (desc, max 5):");
  for (const d of latestSleep.docs) {
    const data = d.data() as Record<string, unknown>;
    console.log(JSON.stringify({ id: d.id, day: data.day, fetchedAt: data.fetchedAt }, null, 2));
  }

  console.log("\n=== 6) sleepNights (requested day + D-1 + D-2) ===\n");
  const anchorMinus1 = dayMinus(day, 1);
  const anchorMinus2 = dayMinus(day, 2);
  for (const anchor of [day, anchorMinus1, anchorMinus2]) {
    const sn = await userRef.collection("sleepNights").doc(anchor).get();
    if (!sn.exists) {
      console.log(`sleepNights/${anchor}: (no document)`);
      continue;
    }
    const data = sn.data() as Record<string, unknown>;
    console.log(
      JSON.stringify(
        {
          path: sn.ref.path,
          anchorDay: data.anchorDay,
          wakeDay: data.wakeDay,
          isComplete: data.isComplete,
          score: data.score,
          totalSleepMinutes: data.totalSleepMinutes,
          remMinutes: data.remMinutes,
          deepMinutes: data.deepMinutes,
          efficiency: data.efficiency,
          lowestHeartRateBpm: data.lowestHeartRateBpm,
          averageHrvMs: data.averageHrvMs,
          physiologySource: data.physiologySource,
          rawCandidateKeys: sleepPhysiologyCandidateKeys(data),
          startedAt: data.startedAt,
          endedAt: data.endedAt,
        },
        null,
        2,
      ),
    );
  }

  console.log("\n=== 7) GET /users/me/sleep-night resolution (loadSleepNightView) ===\n");
  try {
    const { loadSleepNightView } = await import("../../services/api/src/lib/sleepNightRead");
    const view = await loadSleepNightView(uid, day);
    console.log(JSON.stringify(serializeFirestoreValue(view ?? null), null, 2));
  } catch (e) {
    console.log("(loadSleepNightView failed — check ADC and that services/api can initialize Firestore)", e);
  }

  console.log(
    [
      "",
      "=== 8) Log search hints (run locally with gcloud) ===",
      "  oura_pull_sleep_latest_wake",
      "  oura_sleep_docs_dropped",
      "  oura_sleep_snapshot_docs_dropped",
      "  oura_pull_now_token_refresh_failed",
      "  oura_pull_now_fetch_skipped (dataset: daily_readiness)",
      "  onRawEventCreated / normalization (search jsonPayload.msg in your sink)",
      "  dailyFacts recompute (jsonPayload.msg ~ sch_dailyFacts or recompute)",
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
