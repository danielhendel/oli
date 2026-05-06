#!/usr/bin/env node
/**
 * One-time replay: re-run Firestore normalization for existing `apple_health` + `workout` rawEvents
 * whose workout local day matches `--day`, then POST `recomputeDailyFactsAdminHttp` for that day.
 *
 * Delegates to `replay-apple-health-workouts.runner.ts` (tsx) so we call the real
 * `processRawEventForNormalization` implementation (same as onRawEventCreated).
 *
 * Prerequisites:
 * - Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS for Firestore
 * - For recompute POST: FIREBASE_TOKEN, RECOMPUTE_DAILY_FACTS_URL, and gcloud identity token (or GOOGLE_IDENTITY_TOKEN)
 *
 * Usage (repo root):
 *
 *   node scripts/admin/replay-apple-health-workouts.mjs
 *   node scripts/admin/replay-apple-health-workouts.mjs --userId 1Uwhcp4OShV3QLz3VKMHWo5B3033 --day 2026-05-05
 *   node scripts/admin/replay-apple-health-workouts.mjs --dry-run
 *   node scripts/admin/replay-apple-health-workouts.mjs --skip-recompute
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const runner = path.join(__dirname, "replay-apple-health-workouts.runner.ts");
const tsconfig = path.join(__dirname, "../tsconfig.json");

const result = spawnSync("npx", ["tsx", "--tsconfig", tsconfig, runner, ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
  shell: false,
});

process.exit(result.status ?? 1);
