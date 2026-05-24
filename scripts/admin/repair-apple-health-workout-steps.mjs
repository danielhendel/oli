#!/usr/bin/env node
/**
 * Admin repair: patch raw + canonical step counts for specific Apple Health workouts
 * that were ingested before the P0 HealthKit step-enrichment fix.
 *
 * Scope (must be supplied at the CLI; nothing is scanned)
 * -------------------------------------------------------
 * Operator hands the script a JSON file with exact rawEventIds and device-measured
 * step totals captured via `/debug/integrations` (which runs the fixed
 * `getStepCountForDateRange`). The script:
 *   1. Validates the JSON against `--uid` / `--day`.
 *   2. Reads each `users/{uid}/rawEvents/{rawEventId}` + `users/{uid}/events/{rawEventId}`.
 *   3. For each:
 *      - skips if not apple_health workout / kind/id mismatch / payload missing
 *      - skips if raw or canonical `steps` is already positive, or an audit marker exists
 *      - skips with `device_reported_no_samples` if measured steps is `null`
 *      - skips with `measured_zero_no_op` if measurement rounds to 0
 *      - otherwise plans a transactional patch of raw `payload.steps` (+ audit marker
 *        `appleHealthWorkoutStepsRepairV1`) and canonical `steps` + `updatedAt`.
 *   4. In `--apply` mode, runs the per-workout transaction.
 *   5. POSTs `recomputeDailyFactsAdminHttp` for `--day` (unless `--skip-recompute`).
 *   6. Re-reads `users/{uid}/dailyFacts/{day}` and prints partition / allocation summary.
 *
 * Safety
 * ------
 * - **Dry-run by default.** Writes only when `--apply` is passed.
 * - **Single transaction per workout.** Re-reads inside the transaction and refuses to
 *   write if state has changed since planning (raw/canonical steps became positive, or
 *   an audit marker appeared).
 * - **Idempotent.** Re-running with the same JSON skips already-repaired rows.
 * - **Reversible.** Raw audit marker preserves `previousStepsValue` so a follow-up
 *   script could roll back the canonical write and clear the audit.
 * - **Scoped.** Only the rawEventIds listed in the JSON are touched. Nothing else.
 * - **No estimation.** Only the device-measured value is used; `null` means no patch.
 * - **No semantic change to `writeCanonicalEventImmutable`**: this script writes directly
 *   to Firestore via the admin SDK. The production canonical-immutability gate is
 *   unaltered. This is an explicit, documented, admin-only bypass.
 *
 * Usage (repo root)
 * -----------------
 *
 *   # Dry-run
 *   node scripts/admin/repair-apple-health-workout-steps.mjs \
 *     --uid 1Uwhcp4OShV3QLz3VKMHWo5B3033 \
 *     --day 2026-05-24 \
 *     --measurements ./repair-2026-05-24.json
 *
 *   # Apply (writes to Firestore; recomputes DailyFacts)
 *   export FIREBASE_TOKEN='<Firebase ID token with admin: true claim>'
 *   export RECOMPUTE_DAILY_FACTS_URL='https://recomputedailyfactsadminhttp-XXXX-uc.a.run.app'
 *   node scripts/admin/repair-apple-health-workout-steps.mjs \
 *     --uid 1Uwhcp4OShV3QLz3VKMHWo5B3033 \
 *     --day 2026-05-24 \
 *     --measurements ./repair-2026-05-24.json \
 *     --apply
 *
 * Measurements JSON shape
 * -----------------------
 *
 *   {
 *     "uid": "1Uwhcp4OShV3QLz3VKMHWo5B3033",
 *     "day": "2026-05-24",
 *     "measurements": [
 *       { "rawEventId": "appleHealth:v2:workout:...", "steps": 1843 },
 *       { "rawEventId": "appleHealth:v2:workout:...", "steps": null }
 *     ]
 *   }
 *
 * Env / auth
 * ----------
 * - Firestore: ADC (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 * - Recompute POST: FIREBASE_TOKEN + RECOMPUTE_DAILY_FACTS_URL (or `--url`).
 *   - X-Serverless-Authorization: Bearer <gcloud identity token>
 *   - Authorization: Bearer <Firebase ID token>
 * - Pass `--skip-recompute` to perform writes without invoking the recompute endpoint.
 */

import { createRequire } from "module";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const {
  REPAIR_AUDIT_KEY,
  validateMeasurementsFile,
  planRepairForWorkout,
  verifyAllocationPartition,
} = require("./lib/repair-apple-health-workout-steps-plan.cjs");

function logLine(level, msg, payload = {}) {
  const line = JSON.stringify({ level, ts: new Date().toISOString(), msg, ...payload });
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}
const logInfo = (msg, payload) => logLine("info", msg, payload);
const logWarn = (msg, payload) => logLine("warn", msg, payload);
const logError = (msg, payload) => logLine("error", msg, payload);

function parseArgs(argv) {
  const out = {
    uid: null,
    day: null,
    measurementsPath: null,
    apply: false,
    skipRecompute: false,
    url: process.env.RECOMPUTE_DAILY_FACTS_URL?.trim() || null,
    projectId:
      process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "oli-staging-fdbba",
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--uid") out.uid = argv[++i] ?? null;
    else if (a === "--day") out.day = argv[++i] ?? null;
    else if (a === "--measurements") out.measurementsPath = argv[++i] ?? null;
    else if (a === "--apply") out.apply = true;
    else if (a === "--skip-recompute") out.skipRecompute = true;
    else if (a === "--url") out.url = argv[++i]?.trim() ?? null;
    else if (a === "--project-id") out.projectId = argv[++i] ?? out.projectId;
  }
  return out;
}

function printUsage() {
  // eslint-disable-next-line no-console
  console.error(`
Usage:
  node scripts/admin/repair-apple-health-workout-steps.mjs \\
    --uid <uid> \\
    --day <YYYY-MM-DD> \\
    --measurements <path-to-json> \\
    [--apply] \\
    [--skip-recompute] \\
    [--url <recompute_url>] \\
    [--project-id <gcp_project_id>]

Defaults: dry-run; project oli-staging-fdbba.
`);
}

function readGoogleIdentityToken() {
  const fromEnv = process.env.GOOGLE_IDENTITY_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    const token = execFileSync("gcloud", ["auth", "print-identity-token"], {
      encoding: "utf-8",
    }).trim();
    if (!token) throw new Error("empty token from gcloud");
    return token;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to obtain Google identity token (set GOOGLE_IDENTITY_TOKEN or run gcloud auth login): ${message}`,
    );
  }
}

async function postRecompute({ url, userId, date, firebaseToken, googleIdentityToken }) {
  const base = url.replace(/\/$/, "");
  const target = `${base}/`;
  const res = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firebaseToken}`,
      "X-Serverless-Authorization": `Bearer ${googleIdentityToken}`,
    },
    body: JSON.stringify({ userId, date }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _parseError: true, rawBody: text.slice(0, 2000) };
  }
  return { status: res.status, ok: res.ok, json, text };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    process.exit(0);
  }
  if (!args.uid || !args.day || !args.measurementsPath) {
    logError("config_error", { error: "Missing --uid / --day / --measurements" });
    printUsage();
    process.exit(1);
  }

  // 1. Load + validate JSON
  let parsedJson;
  try {
    const raw = readFileSync(args.measurementsPath, "utf-8");
    parsedJson = JSON.parse(raw);
  } catch (err) {
    logError("measurements_read_failed", {
      path: args.measurementsPath,
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
  const validated = validateMeasurementsFile(parsedJson, args.uid, args.day);
  if (!validated.ok) {
    logError("measurements_invalid", { error: validated.error });
    process.exit(1);
  }
  const measurements = validated.measurements;
  logInfo("run_start", {
    uid: args.uid,
    day: args.day,
    measurementsPath: args.measurementsPath,
    measurementCount: measurements.length,
    apply: args.apply,
    skipRecompute: args.skipRecompute,
    projectId: args.projectId,
  });

  // 2. Init firebase-admin
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: args.projectId,
    });
  }
  const db = admin.firestore();
  const appliedAt = new Date().toISOString();

  // 3. Plan + execute per-workout
  const stats = {
    planned: 0,
    skipped: 0,
    patched: 0,
    failed: 0,
    plans: [],
  };

  for (const { rawEventId, steps: measuredSteps } of measurements) {
    const rawRef = db.collection("users").doc(args.uid).collection("rawEvents").doc(rawEventId);
    const canonicalRef = db.collection("users").doc(args.uid).collection("events").doc(rawEventId);

    let rawSnap;
    let canonicalSnap;
    try {
      [rawSnap, canonicalSnap] = await Promise.all([rawRef.get(), canonicalRef.get()]);
    } catch (err) {
      stats.failed += 1;
      logError("plan_read_failed", {
        rawEventId,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    const rawDoc = rawSnap.exists ? rawSnap.data() : null;
    const canonicalDoc = canonicalSnap.exists ? canonicalSnap.data() : null;

    const plan = planRepairForWorkout({
      rawEventId,
      measuredSteps,
      rawDoc,
      canonicalDoc,
      appliedAt,
    });
    stats.planned += 1;
    stats.plans.push({ rawEventId, plan });

    if (plan.action === "error") {
      stats.failed += 1;
      logError("plan_error", { rawEventId, error: plan.error });
      continue;
    }
    if (plan.action === "skip") {
      stats.skipped += 1;
      logInfo("plan_skip", { rawEventId, reason: plan.reason, details: plan.details ?? null });
      continue;
    }

    logInfo("plan_patch", {
      rawEventId,
      previousRawSteps: plan.previousRawSteps,
      previousCanonicalSteps: plan.previousCanonicalSteps,
      correctedStepsValue: plan.correctedStepsValue,
      mode: args.apply ? "APPLY" : "DRY_RUN",
    });

    if (!args.apply) continue;

    try {
      await db.runTransaction(async (tx) => {
        const [rawNow, canonicalNow] = await Promise.all([tx.get(rawRef), tx.get(canonicalRef)]);
        const rawNowDoc = rawNow.exists ? rawNow.data() : null;
        const canonicalNowDoc = canonicalNow.exists ? canonicalNow.data() : null;
        const livePlan = planRepairForWorkout({
          rawEventId,
          measuredSteps,
          rawDoc: rawNowDoc,
          canonicalDoc: canonicalNowDoc,
          appliedAt,
        });
        if (livePlan.action !== "patch") {
          // State changed under us — abort this transaction with a no-op.
          throw new Error(
            `plan_changed_inside_tx: action=${livePlan.action} reason=${
              livePlan.action === "skip" ? livePlan.reason : ""
            }`,
          );
        }
        tx.update(rawRef, { payload: livePlan.rawPayloadPatch });
        tx.update(canonicalRef, livePlan.canonicalPatch);
      });
      stats.patched += 1;
      logInfo("wrote_raw_and_canonical", {
        rawEventId,
        correctedStepsValue: plan.correctedStepsValue,
      });
    } catch (err) {
      stats.failed += 1;
      logError("apply_tx_failed", {
        rawEventId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logInfo("plan_summary", {
    planned: stats.planned,
    skipped: stats.skipped,
    patched: stats.patched,
    failed: stats.failed,
    apply: args.apply,
  });

  // 4. Recompute DailyFacts (apply mode only)
  if (!args.apply) {
    logInfo("dry_run_complete", { note: "Re-run with --apply to write." });
    process.exit(stats.failed > 0 ? 1 : 0);
  }

  if (stats.patched === 0) {
    logInfo("no_patches_applied", { note: "Skipping recompute (nothing changed)." });
    process.exit(stats.failed > 0 ? 1 : 0);
  }

  if (args.skipRecompute) {
    logWarn("recompute_skipped", { reason: "--skip-recompute" });
    process.exit(stats.failed > 0 ? 1 : 0);
  }

  if (!args.url) {
    logError("recompute_skipped_missing_url", {
      hint: "Set RECOMPUTE_DAILY_FACTS_URL or pass --url, or rerun with --skip-recompute.",
    });
    process.exit(1);
  }

  const firebaseToken = process.env.FIREBASE_TOKEN?.trim();
  if (!firebaseToken) {
    logError("recompute_missing_firebase_token", {
      hint: "Set FIREBASE_TOKEN to a Firebase ID token minted for an admin-claimed user.",
    });
    process.exit(1);
  }

  let googleIdentityToken;
  try {
    googleIdentityToken = readGoogleIdentityToken();
  } catch (err) {
    logError("recompute_identity_token_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  let recomputeResult;
  try {
    recomputeResult = await postRecompute({
      url: args.url,
      userId: args.uid,
      date: args.day,
      firebaseToken,
      googleIdentityToken,
    });
  } catch (err) {
    logError("recompute_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  if (recomputeResult.status === 401 || recomputeResult.status === 403) {
    logWarn("recompute_auth_retry", { status: recomputeResult.status });
    try {
      googleIdentityToken = readGoogleIdentityToken();
      recomputeResult = await postRecompute({
        url: args.url,
        userId: args.uid,
        date: args.day,
        firebaseToken,
        googleIdentityToken,
      });
    } catch (err) {
      logError("recompute_retry_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  }

  if (!recomputeResult.ok || (recomputeResult.json && recomputeResult.json.ok === false)) {
    logError("recompute_ok=false", {
      status: recomputeResult.status,
      body: recomputeResult.json ?? recomputeResult.text.slice(0, 2000),
    });
    process.exit(1);
  }
  logInfo("recompute_ok", { status: recomputeResult.status, response: recomputeResult.json });

  // 5. Verify allocation
  try {
    const factsSnap = await db
      .collection("users")
      .doc(args.uid)
      .collection("dailyFacts")
      .doc(args.day)
      .get();
    if (!factsSnap.exists) {
      logError("verify_facts_missing", { uid: args.uid, day: args.day });
      process.exit(1);
    }
    const facts = factsSnap.data();
    const activity = facts && typeof facts === "object" ? facts["activity"] : null;
    const allocation =
      activity && typeof activity === "object" ? activity["stepsAllocation"] : null;
    const steps =
      activity && typeof activity === "object" && typeof activity["steps"] === "number"
        ? activity["steps"]
        : null;
    if (!allocation || steps === null) {
      logError("verify_allocation_missing", {
        hasActivity: !!activity,
        hasAllocation: !!allocation,
        steps,
      });
      process.exit(1);
    }
    const partition = verifyAllocationPartition({ steps, allocation });
    if (!partition.ok) {
      logError("verify_partition_violation", { steps, allocation, error: partition.error });
      process.exit(1);
    }
    logInfo("verify_allocation_ok", {
      uid: args.uid,
      day: args.day,
      activitySteps: steps,
      allocation: {
        neatSteps: allocation.neatSteps,
        strengthSteps: allocation.strengthSteps,
        cardioSteps: allocation.cardioSteps,
      },
    });
  } catch (err) {
    logError("verify_read_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  logInfo("run_complete", {
    uid: args.uid,
    day: args.day,
    patched: stats.patched,
    skipped: stats.skipped,
    failed: stats.failed,
    auditField: REPAIR_AUDIT_KEY,
  });
  process.exit(stats.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  const stack = err instanceof Error ? err.stack : undefined;
  const message = err instanceof Error ? err.message : String(err);
  logError("fatal", { error: message, stack });
  process.exit(1);
});
