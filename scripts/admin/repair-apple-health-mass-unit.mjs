#!/usr/bin/env node
/**
 * Admin repair: Apple Health body mass values stored under kg field names but sourced as **pounds**
 * from react-native-health when `unit` was omitted (native defaults to `poundUnit`).
 *
 * What is touched
 * ---------------
 * Collection: `users/{uid}/rawEvents`
 * Documents where ALL of:
 *   - `provider` === `apple_health`
 *   - `sourceId` is `apple_health` OR `healthkit`
 *   - `observedAt` parses to a time **strictly before** `--before-observed-at` (operator-controlled cutoff)
 *   - `kind` === `weight` with finite `payload.weightKg` and no `payload.appleHealthWeightLbMislabeledAsKgRepair`
 *   - OR (with `--include-lean-mass`) `kind` === `body_composition` with finite `payload.leanBodyMassKg`
 *     and no `payload.appleHealthLeanMassLbMislabeledAsKgRepair`
 *
 * What is written (in-place update, same document id / idempotency key preserved)
 * -------------------------------------------------------------------------------
 * - `payload.weightKg`  → previous numeric × LB_TO_KG (0.45359237)
 * - optional `payload.leanBodyMassKg` → same conversion when flag set
 * - audit object on payload per `lib/contracts/rawEvent.ts` (contract-valid)
 *
 * Safety
 * ------
 * - Default is **dry-run**; requires explicit `--apply` to write.
 * - **No deletes**; one doc at a time in batches of ≤400 updates.
 * - **Idempotent**: skips rows that already have the repair marker.
 * - **Scoped** by uid + cutoff time — operator chooses `before-observed-at` (e.g. first build that shipped `unit: "kg"`).
 *
 * What this does NOT do
 * ---------------------
 * - Does not re-trigger Cloud Functions (no new raw create). If `dailyFacts` must refresh, run your
 *   existing recompute path for affected days after repair.
 *
 * Usage (from repo root, ADC or GOOGLE_APPLICATION_CREDENTIALS set for the target project):
 *
 *   node scripts/admin/repair-apple-health-mass-unit.mjs \
 *     --uid YOUR_FIREBASE_UID \
 *     --before-observed-at 2026-04-02T00:00:00.000Z
 *
 *   node scripts/admin/repair-apple-health-mass-unit.mjs \
 *     --uid YOUR_FIREBASE_UID \
 *     --before-observed-at 2026-04-02T00:00:00.000Z \
 *     --include-lean-mass \
 *     --apply
 *
 * Verify: query a repaired doc in Firestore — `payload.appleHealthWeightLbMislabeledAsKgRepair.correctedWeightKg`
 * should equal `previousStoredNumeric * 0.45359237` (within float noise); Body / raw fetches show sane kg→lb display.
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const LB_TO_KG = 0.45359237;

function parseArgs(argv) {
  const out = {
    uid: null,
    beforeObservedAt: null,
    apply: false,
    includeLeanMass: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--include-lean-mass") out.includeLeanMass = true;
    else if (a === "--uid") out.uid = argv[++i] ?? null;
    else if (a === "--before-observed-at") out.beforeObservedAt = argv[++i] ?? null;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function isAppleHealthBodySource(sourceId) {
  return sourceId === "apple_health" || sourceId === "healthkit";
}

function planWeightRepair(payload, appliedAt) {
  if (payload.appleHealthWeightLbMislabeledAsKgRepair) return null;
  const w = payload.weightKg;
  if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) return null;
  const correctedWeightKg = w * LB_TO_KG;
  return {
    weightKg: correctedWeightKg,
    appleHealthWeightLbMislabeledAsKgRepair: {
      version: 1,
      appliedAt,
      precondition: "react_native_health_default_lb_stored_as_weightKg",
      previousStoredNumeric: w,
      correctedWeightKg,
    },
  };
}

function planLeanRepair(payload, appliedAt) {
  if (payload.appleHealthLeanMassLbMislabeledAsKgRepair) return null;
  const lean = payload.leanBodyMassKg;
  if (typeof lean !== "number" || !Number.isFinite(lean) || lean <= 0) return null;
  const correctedLeanBodyMassKg = lean * LB_TO_KG;
  return {
    leanBodyMassKg: correctedLeanBodyMassKg,
    appleHealthLeanMassLbMislabeledAsKgRepair: {
      version: 1,
      appliedAt,
      precondition: "react_native_health_default_lb_stored_as_leanBodyMassKg",
      previousStoredNumeric: lean,
      correctedLeanBodyMassKg,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`See file header in scripts/admin/repair-apple-health-mass-unit.mjs`);
    process.exit(0);
  }
  if (!args.uid || !args.beforeObservedAt) {
    console.error(
      "Required: --uid and --before-observed-at (ISO). Use --help for examples.",
    );
    process.exit(1);
  }

  const beforeMs = Date.parse(args.beforeObservedAt);
  if (Number.isNaN(beforeMs)) {
    console.error("Invalid --before-observed-at (ISO 8601)");
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = admin.firestore();
  const col = db.collection("users").doc(args.uid).collection("rawEvents");

  const appliedAt = new Date().toISOString();
  let scanned = 0;
  let wouldUpdate = 0;
  let updated = 0;
  const batchSize = 400;
  let batch = db.batch();
  let batchCount = 0;
  const FieldPath = admin.firestore.FieldPath;

  async function flush() {
    if (batchCount === 0) return;
    if (args.apply) {
      await batch.commit();
    }
    batch = db.batch();
    batchCount = 0;
  }

  /** Stable pagination: kind equality + documentId order (no composite beyond default). */
  async function forEachRawDocOfKind(kind, visit) {
    const pageSize = 400;
    let lastDoc = null;
    for (;;) {
      let q = col.where("kind", "==", kind).orderBy(FieldPath.documentId()).limit(pageSize);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;
      for (const doc of snap.docs) {
        lastDoc = doc;
        await visit(doc);
      }
      if (snap.size < pageSize) break;
    }
  }

  const kinds = args.includeLeanMass ? ["weight", "body_composition"] : ["weight"];
  for (const kind of kinds) {
    await forEachRawDocOfKind(kind, async (doc) => {
      const data = doc.data();
      scanned += 1;

      if (data.provider !== "apple_health") return;
      if (!isAppleHealthBodySource(data.sourceId)) return;

      const obs = data.observedAt;
      if (typeof obs !== "string") return;
      const obsMs = Date.parse(obs);
      if (Number.isNaN(obsMs) || obsMs >= beforeMs) return;

      const payload = data.payload && typeof data.payload === "object" ? { ...data.payload } : null;
      if (!payload) return;

      let nextPayload = { ...payload };
      let touched = false;

      if (kind === "weight") {
        const patch = planWeightRepair(nextPayload, appliedAt);
        if (patch) {
          nextPayload = { ...nextPayload, ...patch };
          touched = true;
        }
      } else if (kind === "body_composition") {
        const wPatch = planWeightRepair(nextPayload, appliedAt);
        if (wPatch) {
          nextPayload = { ...nextPayload, ...wPatch };
          touched = true;
        }
        const lPatch = planLeanRepair(nextPayload, appliedAt);
        if (lPatch) {
          nextPayload = { ...nextPayload, ...lPatch };
          touched = true;
        }
      }

      if (!touched) return;

      wouldUpdate += 1;
      const w0 = payload.weightKg;
      const w1 = nextPayload.weightKg;
      const l0 = payload.leanBodyMassKg;
      const l1 = nextPayload.leanBodyMassKg;
      console.log(
        `${args.apply ? "APPLY" : "DRY_RUN"} ${doc.id} kind=${kind} observedAt=${obs} weightKg ${w0 ?? "—"}→${w1 ?? "—"} leanKg ${l0 ?? "—"}→${l1 ?? "—"}`,
      );

      if (args.apply) {
        batch.update(doc.ref, { payload: nextPayload });
        batchCount += 1;
        updated += 1;
        if (batchCount >= batchSize) {
          await flush();
        }
      }
    });
  }

  await flush();

  console.log(
    JSON.stringify(
      {
        uid: args.uid,
        beforeObservedAt: args.beforeObservedAt,
        apply: args.apply,
        includeLeanMass: args.includeLeanMass,
        scanned,
        plannedUpdates: wouldUpdate,
        writesCommitted: args.apply ? updated : 0,
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
