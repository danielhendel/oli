#!/usr/bin/env npx tsx
/**
 * Admin-only: align `users/{uid}/ouraVendorSleep` document `day` with
 * `resolveOuraSleepIngestBase` using the paired `rawEvents/{sameDocId}` Oura sleep row only.
 *
 * Default: dry-run (no writes). Mutations require `--write`.
 * Require `--uid <uid>` unless `--all-users` is passed (collectionGroup scan).
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/backfillOuraVendorSleepDay.cli.ts \
 *     --project-id <firebaseProjectId> --uid <uid>
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/backfillOuraVendorSleepDay.cli.ts \
 *     --project-id <firebaseProjectId> --uid <uid> --write
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/backfillOuraVendorSleepDay.cli.ts \
 *     --project-id <firebaseProjectId> --all-users --write
 *
 * Environment: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login
 */

import { initializeApp, getApps } from "firebase-admin/app";
import type { DocumentReference, Firestore, QueryDocumentSnapshot, WriteBatch } from "firebase-admin/firestore";
import { getFirestore, FieldPath, FieldValue } from "firebase-admin/firestore";

import {
  planOuraVendorSleepDayFromRaw,
  buildVendorSleepDayMigrationWritePatch,
  isOuraIngestedSleepRawEvent,
} from "../../services/api/src/lib/ouraVendorSleepDayBackfill";

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
    };

function parseArgs(argv: string[]): Parsed {
  let projectId: string | null = null;
  let uid: string | null = null;
  let allUsers = false;
  let write = false;
  let verbose = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { mode: "help" };
    if (a === "--project-id") projectId = argv[++i]?.trim() ?? null;
    else if (a === "--uid") uid = argv[++i]?.trim() ?? null;
    else if (a === "--all-users") allUsers = true;
    else if (a === "--write") write = true;
    else if (a === "--verbose") verbose = true;
  }
  if (!projectId) return { mode: "usage" };
  if (allUsers && uid) return { mode: "usage" };
  if (!allUsers && (!uid || uid.length === 0)) return { mode: "usage" };
  return { mode: "run", projectId, uid, allUsers, write, verbose };
}

function printHelp(): void {
  console.log(`backfillOuraVendorSleepDay.cli.ts

Rewrites only users/{uid}/ouraVendorSleep docs where stored day ≠ rollup from paired rawEvents sleep
(same document id; Oura ingest only). Adds migratedAt + migrationVersion. Does not touch rawEvents,
canonical events, dailyFacts, or readiness.

Required:
  --project-id <firebaseProjectId>

Exactly one of:
  --uid <uid>
  --all-users            (uses collectionGroup('ouraVendorSleep'); slower / needs index)

Options:
  --write                  perform batched writes (default: dry-run)
  --verbose                log each skip/change line

Dry-run is the default when --write is omitted.
`);
}

type Counts = {
  scanned: number;
  aligned: number;
  changed: number;
  skipped: number;
  errors: number;
};

function emptyCounts(): Counts {
  return { scanned: 0, aligned: 0, changed: 0, skipped: 0, errors: 0 };
}

function extractUidFromVendorRef(refPath: string): string | null {
  const m = /^users\/([^/]+)\/ouraVendorSleep\//.exec(refPath);
  return m?.[1] ?? null;
}

type SingleWrite = { ref: DocumentReference; data: Record<string, unknown> };

async function commitBatchOrSingles(db: Firestore, batch: WriteBatch, singles: SingleWrite[]): Promise<number> {
  let errors = 0;
  try {
    await batch.commit();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error({ msg: "oura_vendor_sleep_day_batch_commit_failed", err: msg });
    for (const { ref, data } of singles) {
      try {
        await ref.set(data, { merge: true });
      } catch (e2) {
        errors += 1;
        const m2 = e2 instanceof Error ? e2.message : String(e2);
        console.error({ msg: "oura_vendor_sleep_day_single_write_failed", path: ref.path, err: m2 });
      }
    }
  }
  return errors;
}

async function runForUser(db: Firestore, uid: string, write: boolean, verbose: boolean): Promise<Counts> {
  const counts = emptyCounts();
  const vendorCol = db.collection("users").doc(uid).collection("ouraVendorSleep");
  const rawCol = db.collection("users").doc(uid).collection("rawEvents");

  let batch: WriteBatch | null = null;
  const singles: SingleWrite[] = [];
  let batchOps = 0;

  const enqueueWrite = async (ref: DocumentReference, patch: Record<string, unknown>) => {
    if (!write) return;
    if (!batch) batch = db.batch();
    batch.set(ref, patch, { merge: true });
    singles.push({ ref, data: patch });
    batchOps += 1;
    if (batchOps >= BATCH_MAX && batch) {
      counts.errors += await commitBatchOrSingles(db, batch, singles);
      singles.length = 0;
      batchOps = 0;
      batch = null;
    }
  };

  const flushPending = async () => {
    if (!write || !batch || batchOps === 0) return;
    counts.errors += await commitBatchOrSingles(db, batch, singles);
    singles.length = 0;
    batchOps = 0;
    batch = null;
  };

  let last: QueryDocumentSnapshot | undefined;
  while (true) {
    let q = vendorCol.orderBy(FieldPath.documentId()).limit(400);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    if (page.empty) break;

    for (const vDoc of page.docs) {
      counts.scanned += 1;
      const vData = vDoc.data() as Record<string, unknown>;
      const storedDay = typeof vData.day === "string" ? vData.day : undefined;

      const rawSnap = await rawCol.doc(vDoc.id).get();
      if (!rawSnap.exists) {
        counts.skipped += 1;
        if (verbose) console.log(`skip ${uid}/${vDoc.id} missing_raw_doc`);
        continue;
      }
      const rawData = rawSnap.data() as Record<string, unknown>;
      if (!isOuraIngestedSleepRawEvent(rawData)) {
        counts.skipped += 1;
        if (verbose) console.log(`skip ${uid}/${vDoc.id} raw_not_oura_sleep`);
        continue;
      }
      const payload =
        rawData.payload && typeof rawData.payload === "object"
          ? (rawData.payload as Record<string, unknown>)
          : undefined;

      const plan = planOuraVendorSleepDayFromRaw(vDoc.id, storedDay, payload);
      if (plan.status === "skip") {
        counts.skipped += 1;
        if (verbose) console.log(`skip ${uid}/${vDoc.id} ${plan.reason}`);
        continue;
      }
      if (plan.status === "aligned") {
        counts.aligned += 1;
        continue;
      }

      counts.changed += 1;
      const patch = buildVendorSleepDayMigrationWritePatch({
        rollupDay: plan.rollupDay,
        migratedAt: FieldValue.serverTimestamp(),
      });

      if (verbose) {
        console.log(`change ${uid}/${vDoc.id} day ${plan.storedDay} -> ${plan.rollupDay}`);
      }

      await enqueueWrite(vDoc.ref, { ...patch });
    }

    await flushPending();

    last = page.docs[page.docs.length - 1];
    if (page.size < 400) break;
  }

  await flushPending();
  return counts;
}

async function runAllUsers(db: Firestore, write: boolean, verbose: boolean): Promise<Counts> {
  const counts = emptyCounts();

  let batch: WriteBatch | null = null;
  const singles: SingleWrite[] = [];
  let batchOps = 0;

  const enqueueWrite = async (ref: DocumentReference, patch: Record<string, unknown>) => {
    if (!write) return;
    if (!batch) batch = db.batch();
    batch.set(ref, patch, { merge: true });
    singles.push({ ref, data: patch });
    batchOps += 1;
    if (batchOps >= BATCH_MAX && batch) {
      counts.errors += await commitBatchOrSingles(db, batch, singles);
      singles.length = 0;
      batchOps = 0;
      batch = null;
    }
  };

  const flushPending = async () => {
    if (!write || !batch || batchOps === 0) return;
    counts.errors += await commitBatchOrSingles(db, batch, singles);
    singles.length = 0;
    batchOps = 0;
    batch = null;
  };

  let last: QueryDocumentSnapshot | undefined;
  while (true) {
    let q = db.collectionGroup("ouraVendorSleep").orderBy(FieldPath.documentId()).limit(300);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    if (page.empty) break;

    for (const vDoc of page.docs) {
      counts.scanned += 1;
      const pathUid = extractUidFromVendorRef(vDoc.ref.path);
      if (!pathUid) {
        counts.skipped += 1;
        if (verbose) console.log(`skip ${vDoc.ref.path} path_not_users_ouraVendorSleep`);
        continue;
      }

      const vData = vDoc.data() as Record<string, unknown>;
      const storedDay = typeof vData.day === "string" ? vData.day : undefined;

      const rawSnap = await db.collection("users").doc(pathUid).collection("rawEvents").doc(vDoc.id).get();
      if (!rawSnap.exists) {
        counts.skipped += 1;
        if (verbose) console.log(`skip ${pathUid}/${vDoc.id} missing_raw_doc`);
        continue;
      }
      const rawData = rawSnap.data() as Record<string, unknown>;
      if (!isOuraIngestedSleepRawEvent(rawData)) {
        counts.skipped += 1;
        if (verbose) console.log(`skip ${pathUid}/${vDoc.id} raw_not_oura_sleep`);
        continue;
      }
      const payload =
        rawData.payload && typeof rawData.payload === "object"
          ? (rawData.payload as Record<string, unknown>)
          : undefined;

      const plan = planOuraVendorSleepDayFromRaw(vDoc.id, storedDay, payload);
      if (plan.status === "skip") {
        counts.skipped += 1;
        if (verbose) console.log(`skip ${pathUid}/${vDoc.id} ${plan.reason}`);
        continue;
      }
      if (plan.status === "aligned") {
        counts.aligned += 1;
        continue;
      }

      counts.changed += 1;
      const patch = buildVendorSleepDayMigrationWritePatch({
        rollupDay: plan.rollupDay,
        migratedAt: FieldValue.serverTimestamp(),
      });

      if (verbose) {
        console.log(`change ${pathUid}/${vDoc.id} day ${plan.storedDay} -> ${plan.rollupDay}`);
      }

      await enqueueWrite(vDoc.ref, { ...patch });
    }

    await flushPending();

    last = page.docs[page.docs.length - 1];
    if (page.size < 300) break;
  }

  await flushPending();
  return counts;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed.mode === "help") {
    printHelp();
    process.exit(0);
  }
  if (parsed.mode === "usage") {
    printHelp();
    console.error("Invalid args: need --project-id and (--uid <uid> | --all-users), not both uid and --all-users.");
    process.exit(1);
  }

  const { projectId, uid, allUsers, write, verbose } = parsed;
  if (!getApps().length) {
    initializeApp({ projectId });
  }
  const db = getFirestore();

  console.log(
    JSON.stringify(
      {
        msg: "oura_vendor_sleep_day_backfill_start",
        dryRun: !write,
        uid: uid ?? null,
        allUsers,
      },
      null,
      2,
    ),
  );

  let totals = emptyCounts();
  try {
    if (allUsers) {
      totals = await runAllUsers(db, write, verbose);
    } else if (uid) {
      totals = await runForUser(db, uid, write, verbose);
    }
  } catch (err) {
    totals.errors += 1;
    console.error(err);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        msg: "oura_vendor_sleep_day_backfill_done",
        dryRun: !write,
        ...totals,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
