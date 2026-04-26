#!/usr/bin/env npx tsx
/**
 * One-off admin: set `users/{uid}.preferences.workoutPickerBundledAllowlistExerciseIds`
 * for Daniel's staging account using Firestore Admin (same field the API merges on PUT /preferences).
 *
 * Usage (repo root, ADC or GOOGLE_APPLICATION_CREDENTIALS for the target project):
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/applyDanielStagingWorkoutPickerBundledAllowlist.cli.ts --project-id oli-staging-fdbba --apply
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/applyDanielStagingWorkoutPickerBundledAllowlist.cli.ts --project-id oli-staging-fdbba --verify
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/applyDanielStagingWorkoutPickerBundledAllowlist.cli.ts --project-id oli-staging-fdbba --clear
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/applyDanielStagingWorkoutPickerBundledAllowlist.cli.ts --project-id oli-staging-fdbba --verify-null
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { defaultPreferences, preferencesSchema } from "@oli/contracts";
import {
  DANIEL_STAGING_UID,
  DANIEL_STAGING_WORKOUT_PICKER_BUNDLED_ALLOWLIST,
} from "@/lib/preferences/seeds/danielStagingWorkoutPickerBundledAllowlist";

type Mode = "apply" | "verify" | "verifyNull" | "clear";

function parseArgs(argv: string[]): { mode: Mode; projectId: string } | "help" | "usage" {
  let mode: Mode | null = null;
  let projectId: string | null = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return "help";
    if (a === "--project-id") projectId = argv[++i]?.trim() ?? null;
    else if (a === "--apply") mode = "apply";
    else if (a === "--verify") mode = "verify";
    else if (a === "--verify-null") mode = "verifyNull";
    else if (a === "--clear") mode = "clear";
  }
  if (mode == null || projectId == null || projectId.length === 0) return "usage";
  return { mode, projectId };
}

function printHelp(): void {
  console.log(`applyDanielStagingWorkoutPickerBundledAllowlist.cli.ts

Writes Firestore users/${DANIEL_STAGING_UID} preferences.workoutPickerBundledAllowlistExerciseIds
using bundled allowlist from lib/preferences/seeds/danielStagingWorkoutPickerBundledAllowlist.ts.

Required:
  --project-id <firebaseProjectId>   e.g. oli-staging-fdbba
  exactly one of:
    --apply        merge-set allowlist to DANIEL_STAGING_WORKOUT_PICKER_BUNDLED_ALLOWLIST
    --verify       read back and compare to seed (exit 1 on mismatch)
    --verify-null  read back; exit 0 only if field is null or absent (post-rollback check)
    --clear        merge-set field to null (rollback; full bundled catalog in picker)

Environment:
  GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login
`);
}

function allowlistSetsEqual(a: readonly string[] | null | undefined, b: readonly string[]): boolean {
  if (a == null || !Array.isArray(a)) return false;
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

function readAllowlistFromSnap(data: Record<string, unknown> | undefined): unknown {
  const rawPrefs = data?.["preferences"];
  if (rawPrefs == null || typeof rawPrefs !== "object") return undefined;
  return (rawPrefs as Record<string, unknown>)["workoutPickerBundledAllowlistExerciseIds"];
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed === "help") {
    printHelp();
    process.exit(0);
  }
  if (parsed === "usage") {
    console.error("Missing --project-id and exactly one of --apply | --verify | --verify-null | --clear");
    printHelp();
    process.exit(1);
  }

  const { mode, projectId } = parsed;

  if (!getApps().length) {
    initializeApp({ projectId });
  }
  const db = getFirestore();
  const ref = db.collection("users").doc(DANIEL_STAGING_UID);

  if (mode === "apply") {
    await ref.set(
      { preferences: { workoutPickerBundledAllowlistExerciseIds: [...DANIEL_STAGING_WORKOUT_PICKER_BUNDLED_ALLOWLIST] } },
      { merge: true },
    );
    console.log(JSON.stringify({ ok: true, mode: "apply", uid: DANIEL_STAGING_UID, projectId, count: DANIEL_STAGING_WORKOUT_PICKER_BUNDLED_ALLOWLIST.length }, null, 2));
  } else if (mode === "clear") {
    await ref.set({ preferences: { workoutPickerBundledAllowlistExerciseIds: null } }, { merge: true });
    console.log(JSON.stringify({ ok: true, mode: "clear", uid: DANIEL_STAGING_UID, projectId }, null, 2));
  }

  const snap = await ref.get();
  const data = snap.data() as Record<string, unknown> | undefined;
  const rawAllowlist = readAllowlistFromSnap(data);

  const existingRaw = data?.["preferences"] ?? null;
  const existingMerged =
    existingRaw != null && typeof existingRaw === "object"
      ? { ...defaultPreferences(), ...(existingRaw as Record<string, unknown>) }
      : null;
  const existingParsed = existingMerged ? preferencesSchema.safeParse(existingMerged) : null;
  if (existingRaw != null && existingParsed && !existingParsed.success) {
    console.error(JSON.stringify({ ok: false, error: "invalid_preferences_doc", details: existingParsed.error.flatten() }, null, 2));
    process.exit(1);
  }

  if (mode === "verify") {
    const ok = allowlistSetsEqual(
      rawAllowlist as string[] | null | undefined,
      DANIEL_STAGING_WORKOUT_PICKER_BUNDLED_ALLOWLIST,
    );
    console.log(
      JSON.stringify(
        {
          ok,
          mode: "verify",
          uid: DANIEL_STAGING_UID,
          projectId,
          workoutPickerBundledAllowlistExerciseIds: rawAllowlist ?? null,
          expectedCount: DANIEL_STAGING_WORKOUT_PICKER_BUNDLED_ALLOWLIST.length,
        },
        null,
        2,
      ),
    );
    if (!ok) process.exit(1);
    return;
  }

  if (mode === "verifyNull") {
    const ok = rawAllowlist === null || rawAllowlist === undefined;
    console.log(
      JSON.stringify(
        {
          ok,
          mode: "verify-null",
          uid: DANIEL_STAGING_UID,
          projectId,
          workoutPickerBundledAllowlistExerciseIds: rawAllowlist ?? null,
        },
        null,
        2,
      ),
    );
    if (!ok) process.exit(1);
    return;
  }

  if (mode === "apply") {
    const ok = allowlistSetsEqual(
      rawAllowlist as string[] | null | undefined,
      DANIEL_STAGING_WORKOUT_PICKER_BUNDLED_ALLOWLIST,
    );
    if (!ok) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: "verify_after_apply_failed",
            workoutPickerBundledAllowlistExerciseIds: rawAllowlist ?? null,
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
    return;
  }

  if (mode === "clear") {
    const cleared = rawAllowlist === null || rawAllowlist === undefined;
    if (!cleared) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: "verify_after_clear_failed",
            workoutPickerBundledAllowlistExerciseIds: rawAllowlist ?? null,
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
