#!/usr/bin/env npx tsx
/**
 * Admin: build `users/{uid}/sleepNights/{anchorDay}` from paired Oura vendor sleep + rawEvents rows.
 * Never mutates rawEvents, events, or dailyFacts.
 *
 * Default: dry-run. Mutations require `--write`.
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/backfillSleepNightsFromOura.cli.ts \
 *     --project-id <firebaseProjectId> --uid <uid>
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/backfillSleepNightsFromOura.cli.ts \
 *     --project-id <firebaseProjectId> --uid <uid> --write
 */

import { initializeApp, getApps } from "firebase-admin/app";
import type { DocumentReference, Firestore, QueryDocumentSnapshot, WriteBatch } from "firebase-admin/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import type { OuraSleepDocument } from "../../services/api/src/lib/ouraApi";
import {
  buildOuraSleepDocumentFromOuraIngestSleepPayload,
  isOuraIngestedSleepRawEvent,
} from "../../services/api/src/lib/ouraVendorSleepDayBackfill";
import {
  buildSleepNightFirestorePayloadWithOuraReadiness,
  enrichReadinessRecordWithRawPayload,
  readinessDayFromReadinessRecord,
} from "../../services/api/src/lib/oura/readinessForSleepNightMerge";
import {
  pickOuraSleepAverageHrvMs,
  pickOuraSleepLowestHeartRateBpm,
} from "../../services/api/src/lib/oura/ouraSleepPhysiology";
import { coerceOuraSleepScore0to100 } from "../../services/api/src/lib/sleepNight";

const BATCH_MAX = 450;

type Parsed =
  | { mode: "help" }
  | { mode: "usage" }
  | {
      mode: "run";
      projectId: string;
      uid: string | null;
      allUsers: boolean;
      write: boolean;
      verbose: boolean;
      targetDay: string | null;
    };

function parseArgs(argv: string[]): Parsed {
  let projectId: string | null = null;
  let uid: string | null = null;
  let allUsers = false;
  let write = false;
  let verbose = false;
  let targetDay: string | null = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { mode: "help" };
    if (a === "--project-id") projectId = argv[++i]?.trim() ?? null;
    else if (a === "--uid") uid = argv[++i]?.trim() ?? null;
    else if (a === "--all-users") allUsers = true;
    else if (a === "--write") write = true;
    else if (a === "--verbose") verbose = true;
    else if (a === "--day") targetDay = argv[++i]?.trim() ?? null;
  }
  if (!projectId) return { mode: "usage" };
  if (allUsers && uid) return { mode: "usage" };
  if (!allUsers && (!uid || uid.length === 0)) return { mode: "usage" };
  if (targetDay != null && !/^\d{4}-\d{2}-\d{2}$/.test(targetDay)) return { mode: "usage" };
  return { mode: "run", projectId, uid, allUsers, write, verbose, targetDay };
}

function printHelp(): void {
  console.log(`backfillSleepNightsFromOura.cli.ts

Builds users/{uid}/sleepNights/{anchorDay} merge docs from Oura vendor sleep + paired rawEvents/{sameId}.
Dry-run by default; use --write to persist.

Required:
  --project-id <firebaseProjectId>

Exactly one of:
  --uid <uid>
  --all-users            (collectionGroup on ouraVendorSleep)

Options:
  --write
  --verbose
  --day <YYYY-MM-DD>   verbose physiology audit for vendor docs on this day
`);
}

function sleepPhysiologyCandidateKeys(vendor: Record<string, unknown>): string[] {
  const keys = new Set<string>(Object.keys(vendor));
  const payload = vendor.payload;
  if (payload != null && typeof payload === "object" && !Array.isArray(payload)) {
    for (const k of Object.keys(payload as Record<string, unknown>)) {
      keys.add(`payload.${k}`);
    }
  }
  return [...keys]
    .filter((k) => /heart|hrv|hr_/i.test(k) || /lowest|average/i.test(k))
    .sort();
}

function reportSleepPhysiologyGap(
  vendorId: string,
  vendor: Record<string, unknown>,
  merged: OuraSleepDocument,
): void {
  const lhr = pickOuraSleepLowestHeartRateBpm(merged);
  const hrv = pickOuraSleepAverageHrvMs(merged);
  if (lhr !== undefined && hrv !== undefined) return;
  const fromVendor = pickOuraSleepLowestHeartRateBpm(vendor);
  const fromVendorHrv = pickOuraSleepAverageHrvMs(vendor);
  console.log({
    msg: "sleep_doc_lacks_physiology_repull_required",
    vendorId,
    vendorDay: vendor.day,
    missingLowestHeartRate: lhr === undefined,
    missingAverageHrv: hrv === undefined,
    vendorHasLowest: fromVendor !== undefined,
    vendorHasHrv: fromVendorHrv !== undefined,
    rawCandidateKeys: sleepPhysiologyCandidateKeys(vendor),
    note:
      "sleep doc lacks lowest_heart_rate / average_hrv on vendor snapshot and raw payload; re-pull Oura required",
  });
}

type Counts = { scanned: number; changed: number; skipped: number; errors: number };

function emptyCounts(): Counts {
  return { scanned: 0, changed: 0, skipped: 0, errors: 0 };
}

function extractUidFromVendorRef(refPath: string): string | null {
  const m = /^users\/([^/]+)\/ouraVendorSleep\//.exec(refPath);
  return m?.[1] ?? null;
}

function enrichOuraDocFromVendorSnapshot(
  vendorId: string,
  vendor: Record<string, unknown>,
  base: OuraSleepDocument,
): OuraSleepDocument {
  const payload =
    vendor.payload != null && typeof vendor.payload === "object" && !Array.isArray(vendor.payload)
      ? (vendor.payload as Record<string, unknown>)
      : null;
  const v: OuraSleepDocument = {
    ...base,
    ...(payload ?? {}),
    id: vendorId,
  };
  if (typeof vendor.totalSleepDuration === "number") {
    v.total_sleep_duration = vendor.totalSleepDuration as number;
  }
  if (typeof vendor.efficiency === "number") {
    v.efficiency = vendor.efficiency as number;
  }
  if (typeof vendor.remSleep === "number") {
    (v as { rem_sleep_duration?: number }).rem_sleep_duration = vendor.remSleep as number;
  }
  if (typeof vendor.deepSleep === "number") {
    (v as { deep_sleep_duration?: number }).deep_sleep_duration = vendor.deepSleep as number;
  }
  if (typeof vendor.latency === "number") {
    v.latency = vendor.latency as number;
  }
  const s = coerceOuraSleepScore0to100(vendor.score ?? vendor.composite_score);
  if (s != null) (v as { score?: number }).score = s;
  const day = typeof vendor.day === "string" ? vendor.day.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    v.day = day;
  }
  const lhr = vendor.lowestHeartRateBpm ?? vendor.lowest_heart_rate;
  const hrv = vendor.averageHrvMs ?? vendor.average_hrv;
  if (typeof lhr === "number") (v as { lowest_heart_rate?: number }).lowest_heart_rate = lhr;
  if (typeof hrv === "number") (v as { average_hrv?: number }).average_hrv = hrv;
  return v;
}

type SingleWrite = { ref: DocumentReference; data: Record<string, unknown> };

async function commitBatchOrSingles(db: Firestore, batch: WriteBatch, singles: SingleWrite[]): Promise<number> {
  let errors = 0;
  try {
    await batch.commit();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error({ msg: "sleep_night_backfill_batch_failed", err: msg });
    for (const { ref, data } of singles) {
      try {
        await ref.set(data, { merge: true });
      } catch (e2) {
        errors += 1;
        console.error({
          msg: "sleep_night_backfill_single_failed",
          path: ref.path,
          err: e2 instanceof Error ? e2.message : String(e2),
        });
      }
    }
  }
  return errors;
}

async function loadAllOuraVendorReadinessByDay(
  db: Firestore,
  uid: string,
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  const userRef = db.collection("users").doc(uid);
  const snaps = await userRef.collection("ouraVendorReadiness").get();
  for (const docSnap of snaps.docs) {
    let raw = docSnap.data() as Record<string, unknown>;
    const linkedId =
      (typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : null) ?? docSnap.id;
    const rawSnap = await userRef.collection("rawEvents").doc(linkedId).get();
    if (rawSnap.exists) {
      const rawRow = rawSnap.data() as Record<string, unknown>;
      const payload =
        rawRow.payload && typeof rawRow.payload === "object" && !Array.isArray(rawRow.payload)
          ? (rawRow.payload as Record<string, unknown>)
          : null;
      raw = enrichReadinessRecordWithRawPayload(raw, payload);
    }
    const day = readinessDayFromReadinessRecord(raw, docSnap.id);
    if (day) map.set(day, raw);
  }
  return map;
}

async function processVendorDoc(
  db: Firestore,
  uid: string,
  vendorSnap: QueryDocumentSnapshot,
  write: boolean,
  verbose: boolean,
  targetDay: string | null,
  pending: SingleWrite[],
  persistedReadinessByDay: Map<string, Record<string, unknown>>,
): Promise<{ skipped: number; changed: number }> {
  const out = { skipped: 0, changed: 0 };
  const vendorId = vendorSnap.id;
  const vendor = vendorSnap.data() as Record<string, unknown>;

  const rawSnap = await db.collection("users").doc(uid).collection("rawEvents").doc(vendorId).get();
  const raw = rawSnap.data() as Record<string, unknown> | undefined;
  const payload =
    raw && typeof raw.payload === "object" && raw.payload ? (raw.payload as Record<string, unknown>) : undefined;

  if (!raw || !isOuraIngestedSleepRawEvent(raw)) {
    if (verbose) console.log({ msg: "skip_no_oura_raw", uid, vendorId });
    out.skipped += 1;
    return out;
  }

  const base = buildOuraSleepDocumentFromOuraIngestSleepPayload(vendorId, payload ?? {});
  if (!base) {
    if (verbose) console.log({ msg: "skip_unbuildable_raw", uid, vendorId });
    out.skipped += 1;
    return out;
  }

  let merged = enrichOuraDocFromVendorSnapshot(vendorId, vendor, base);

  if (
    pickOuraSleepLowestHeartRateBpm(merged) === undefined ||
    pickOuraSleepAverageHrvMs(merged) === undefined
  ) {
    const ouraRawSnap = await db.collection("users").doc(uid).collection("rawEvents").doc(vendorId).get();
    if (ouraRawSnap.exists) {
      const rawRow = ouraRawSnap.data() as Record<string, unknown>;
      const pl = rawRow.payload as Record<string, unknown> | undefined;
      if (pl?.dataset === "sleep" && pl.data != null && typeof pl.data === "object" && !Array.isArray(pl.data)) {
        merged = enrichOuraDocFromVendorSnapshot(vendorId, vendor, {
          ...merged,
          ...(pl.data as Record<string, unknown>),
        } as OuraSleepDocument);
      }
    }
  }

  const vendorDay = typeof vendor.day === "string" ? vendor.day.trim() : "";
  if (targetDay && vendorDay === targetDay) {
    console.log({
      msg: "sleep_physiology_target_day_audit",
      uid,
      vendorId,
      anchorDay: targetDay,
      rawCandidateKeys: sleepPhysiologyCandidateKeys(vendor),
      pickedLowestHeartRateBpm: pickOuraSleepLowestHeartRateBpm(merged),
      pickedAverageHrvMs: pickOuraSleepAverageHrvMs(merged),
    });
  }

  reportSleepPhysiologyGap(vendorId, vendor, merged);

  const built = buildSleepNightFirestorePayloadWithOuraReadiness(
    merged,
    vendorId,
    [],
    persistedReadinessByDay,
  );
  if (!built) {
    if (verbose) console.log({ msg: "skip_sleep_night_builder", uid, vendorId });
    out.skipped += 1;
    return out;
  }

  const ref = db.collection("users").doc(uid).collection("sleepNights").doc(built.anchorDay);
  const data = { ...built.payload, updatedAt: FieldValue.serverTimestamp() };

  if (verbose) {
    console.log({
      msg: write ? "write_sleep_night" : "dry_run_sleep_night",
      uid,
      anchorDay: built.anchorDay,
      vendorId,
      lowestHeartRateBpm: built.payload.lowestHeartRateBpm,
      averageHrvMs: built.payload.averageHrvMs,
      physiologySource: built.payload.physiologySource,
    });
  }

  out.changed += 1;
  if (write) {
    pending.push({ ref, data });
  }
  return out;
}

async function backfillForUid(
  db: Firestore,
  uid: string,
  write: boolean,
  verbose: boolean,
  targetDay: string | null,
): Promise<Counts> {
  const c = emptyCounts();
  const vendorCol = db.collection("users").doc(uid).collection("ouraVendorSleep");
  const snaps = await vendorCol.get();
  const pending: SingleWrite[] = [];
  const persistedReadinessByDay = await loadAllOuraVendorReadinessByDay(db, uid);

  for (const docSnap of snaps.docs as QueryDocumentSnapshot[]) {
    c.scanned += 1;
    const r = await processVendorDoc(
      db,
      uid,
      docSnap,
      write,
      verbose,
      targetDay,
      pending,
      persistedReadinessByDay,
    );
    c.skipped += r.skipped;
    c.changed += r.changed;
  }

  if (write && pending.length > 0) {
    for (let i = 0; i < pending.length; i += BATCH_MAX) {
      const chunk = pending.slice(i, i + BATCH_MAX);
      const batch = db.batch();
      for (const { ref, data } of chunk) {
        batch.set(ref, data, { merge: true });
      }
      c.errors += await commitBatchOrSingles(db, batch, chunk);
    }
  }

  return c;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed.mode === "help") {
    printHelp();
    return;
  }
  if (parsed.mode === "usage") {
    console.error("Usage: --project-id <id> and (--uid <uid> | --all-users) [--write] [--verbose]");
    process.exitCode = 2;
    return;
  }

  const { projectId, uid, allUsers, write, verbose, targetDay } = parsed;
  if (getApps().length === 0) {
    initializeApp({ projectId });
  }
  const db = getFirestore();

  console.log({
    msg: "sleep_night_backfill_start",
    projectId,
    uid: uid ?? "ALL",
    allUsers,
    write,
  });

  if (!allUsers && uid) {
    const c = await backfillForUid(db, uid, write, verbose, targetDay);
    console.log({ msg: "sleep_night_backfill_done", uid, ...c });
    return;
  }

  const cg = await db.collectionGroup("ouraVendorSleep").get();
  const totals = emptyCounts();
  const pending: SingleWrite[] = [];
  const readinessByUid = new Map<string, Map<string, Record<string, unknown>>>();

  for (const docSnap of cg.docs as QueryDocumentSnapshot[]) {
    totals.scanned += 1;
    const u = extractUidFromVendorRef(docSnap.ref.path);
    if (!u) {
      totals.skipped += 1;
      continue;
    }
    let persistedReadinessByDay = readinessByUid.get(u);
    if (!persistedReadinessByDay) {
      persistedReadinessByDay = await loadAllOuraVendorReadinessByDay(db, u);
      readinessByUid.set(u, persistedReadinessByDay);
    }
    const r = await processVendorDoc(
      db,
      u,
      docSnap,
      write,
      verbose,
      targetDay,
      pending,
      persistedReadinessByDay,
    );
    totals.skipped += r.skipped;
    totals.changed += r.changed;
  }

  if (write && pending.length > 0) {
    for (let i = 0; i < pending.length; i += BATCH_MAX) {
      const chunk = pending.slice(i, i + BATCH_MAX);
      const batch = db.batch();
      for (const { ref, data } of chunk) {
        batch.set(ref, data, { merge: true });
      }
      totals.errors += await commitBatchOrSingles(db, batch, chunk);
    }
  }

  console.log({ msg: "sleep_night_backfill_all_done", ...totals });
}

void main();
