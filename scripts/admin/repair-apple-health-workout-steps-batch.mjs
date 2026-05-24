#!/usr/bin/env node
/**
 * Batch orchestrator on top of `scripts/admin/repair-apple-health-workout-steps.mjs`.
 *
 * Reads a batch measurements JSON (the shape produced by `/debug/integrations`'s
 * `buildBatchHistoricalRepairJsonObject`), splits it into per-day temp JSONs, and
 * spawns the per-day repair script once per day. This keeps the existing per-day
 * script as the single source of truth for repair semantics (planning, Firestore
 * transactions, recompute, partition verification) — the batch script is a thin
 * orchestrator.
 *
 * Safety:
 * - Dry-run by default. Pass `--apply` to write.
 * - One subprocess per day → exits / token refreshes / verify checks happen in the
 *   per-day script exactly as today.
 * - Continues to the next day on a single-day failure (so a single corrupt day does
 *   not block the rest of the batch). A non-zero overall exit code is returned at
 *   the end iff any day failed.
 * - Temp per-day JSONs are written to the OS temp dir and deleted on exit, even on
 *   failure. They are never committed to the repo.
 *
 * Usage:
 *
 *   # Dry-run
 *   node scripts/admin/repair-apple-health-workout-steps-batch.mjs \
 *     --uid 1Uwhcp4OShV3QLz3VKMHWo5B3033 \
 *     --measurements ./repair-batch-activity-steps.json
 *
 *   # Apply (requires the same env as the per-day script):
 *   export FIREBASE_TOKEN='<admin Firebase ID token>'
 *   export RECOMPUTE_DAILY_FACTS_URL='https://recomputedailyfactsadminhttp-XXXX-uc.a.run.app'
 *   node scripts/admin/repair-apple-health-workout-steps-batch.mjs \
 *     --uid 1Uwhcp4OShV3QLz3VKMHWo5B3033 \
 *     --measurements ./repair-batch-activity-steps.json \
 *     --apply
 *
 * Batch measurements JSON shape:
 *
 *   {
 *     "uid": "1Uwhcp4OShV3QLz3VKMHWo5B3033",
 *     "generatedAt": "2026-05-24T15:00:00.000Z",  // optional, informational
 *     "days": [
 *       {
 *         "day": "2026-05-19",
 *         "measurements": [
 *           { "rawEventId": "appleHealth:v2:workout:...", "steps": 1843 }
 *         ]
 *       },
 *       ...
 *     ]
 *   }
 */

import { createRequire } from "module";
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import process from "node:process";

const require = createRequire(import.meta.url);
const { validateBatchMeasurementsFile } = require(
  "./lib/repair-apple-health-workout-steps-plan.cjs",
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PER_DAY_SCRIPT = join(__dirname, "repair-apple-health-workout-steps.mjs");

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
  node scripts/admin/repair-apple-health-workout-steps-batch.mjs \\
    --uid <uid> \\
    --measurements <path-to-batch-json> \\
    [--apply] \\
    [--skip-recompute] \\
    [--url <recompute_url>] \\
    [--project-id <gcp_project_id>]

Defaults: dry-run; project oli-staging-fdbba.

The per-day repair script is the source of truth for repair logic; this script
spawns it once per day with a temporary per-day measurements file.
`);
}

/**
 * Run the per-day repair script as a subprocess. Returns the subprocess exit code.
 *
 * Inherits stdio so per-day logs stream live alongside the orchestrator's own logs.
 * stdin is /dev/null to avoid any interactive prompts ever blocking the batch.
 */
function runPerDay({ uid, day, perDayJsonPath, apply, skipRecompute, url, projectId }) {
  return new Promise((resolve) => {
    const args = [
      PER_DAY_SCRIPT,
      "--uid",
      uid,
      "--day",
      day,
      "--measurements",
      perDayJsonPath,
    ];
    if (apply) args.push("--apply");
    if (skipRecompute) args.push("--skip-recompute");
    if (url) {
      args.push("--url", url);
    }
    if (projectId) {
      args.push("--project-id", projectId);
    }
    const proc = spawn(process.execPath, args, {
      stdio: ["ignore", "inherit", "inherit"],
      env: process.env,
    });
    proc.on("error", (err) => {
      logError("per_day_spawn_error", {
        day,
        error: err instanceof Error ? err.message : String(err),
      });
      resolve(1);
    });
    proc.on("close", (code, signal) => {
      if (signal) {
        logError("per_day_terminated_by_signal", { day, signal });
        resolve(1);
        return;
      }
      resolve(typeof code === "number" ? code : 1);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    process.exit(0);
  }
  if (!args.uid || !args.measurementsPath) {
    logError("config_error", { error: "Missing --uid / --measurements" });
    printUsage();
    process.exit(1);
  }

  // 1. Load + validate batch JSON.
  let parsed;
  try {
    const raw = readFileSync(args.measurementsPath, "utf-8");
    parsed = JSON.parse(raw);
  } catch (err) {
    logError("measurements_read_failed", {
      path: args.measurementsPath,
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
  const validated = validateBatchMeasurementsFile(parsed, args.uid);
  if (!validated.ok) {
    logError("measurements_invalid", { error: validated.error });
    process.exit(1);
  }
  const { days } = validated;

  logInfo("batch_start", {
    uid: args.uid,
    measurementsPath: args.measurementsPath,
    generatedAt: validated.generatedAt,
    dayCount: days.length,
    days: days.map((d) => d.day),
    workoutCount: days.reduce((sum, d) => sum + d.measurements.length, 0),
    apply: args.apply,
    skipRecompute: args.skipRecompute,
    projectId: args.projectId,
  });

  // 2. Create a temp dir for per-day JSONs and remember to clean up.
  let tmpRoot;
  try {
    tmpRoot = mkdtempSync(join(tmpdir(), "oli-repair-batch-"));
  } catch (err) {
    logError("tmp_dir_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
  const tmpFilesToCleanup = [];
  const cleanup = () => {
    for (const f of tmpFilesToCleanup) {
      try {
        unlinkSync(f);
      } catch {
        // ignore
      }
    }
    try {
      rmdirSync(tmpRoot);
    } catch {
      // ignore
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });

  // 3. Run per-day.
  const summary = {
    total: days.length,
    ok: 0,
    failed: 0,
    failedDays: [],
  };

  for (const entry of days) {
    const { day, measurements } = entry;
    const perDayPath = join(tmpRoot, `repair-${day}.json`);
    try {
      writeFileSync(
        perDayPath,
        JSON.stringify({ uid: args.uid, day, measurements }, null, 2),
        "utf-8",
      );
      tmpFilesToCleanup.push(perDayPath);
    } catch (err) {
      summary.failed += 1;
      summary.failedDays.push(day);
      logError("per_day_write_failed", {
        day,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    logInfo("day_start", {
      day,
      workoutCount: measurements.length,
      mode: args.apply ? "APPLY" : "DRY_RUN",
    });

    const code = await runPerDay({
      uid: args.uid,
      day,
      perDayJsonPath: perDayPath,
      apply: args.apply,
      skipRecompute: args.skipRecompute,
      url: args.url,
      projectId: args.projectId,
    });
    if (code === 0) {
      summary.ok += 1;
      logInfo("day_ok", { day });
    } else {
      summary.failed += 1;
      summary.failedDays.push(day);
      logError("day_failed", { day, exitCode: code });
      // Continue to the next day rather than aborting the whole batch.
    }
  }

  logInfo("batch_summary", {
    uid: args.uid,
    apply: args.apply,
    skipRecompute: args.skipRecompute,
    total: summary.total,
    ok: summary.ok,
    failed: summary.failed,
    failedDays: summary.failedDays,
  });

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  const stack = err instanceof Error ? err.stack : undefined;
  const message = err instanceof Error ? err.message : String(err);
  logError("fatal", { error: message, stack });
  process.exit(1);
});
