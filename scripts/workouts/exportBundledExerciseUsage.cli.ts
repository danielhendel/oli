#!/usr/bin/env npx tsx
/**
 * Read-only export: bundled exercise ids used vs unused from `users/{uid}/rawEvents` strength history.
 *
 * Usage (repo root, ADC / GOOGLE_APPLICATION_CREDENTIALS for target project):
 *
 *   npx tsx scripts/workouts/exportBundledExerciseUsage.cli.ts --uid <FirebaseUid> [--out-dir ./artifacts/bundled-exercise-usage]
 */

import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  exerciseDefinitionFirestoreDocSchema,
  exerciseDefinitionRowSchema,
  type ExerciseDefinitionRow,
} from "@oli/contracts";
import { initializeApp, getApps } from "firebase-admin/app";
import type { Firestore, Query as FsQuery, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";

import type { CustomExerciseRecord } from "../../lib/workouts/exercises/customExerciseStore";
import {
  aggregateBundledExerciseUsageFromStrengthExercises,
  finalizeBundledExerciseUsageAggregation,
} from "../../lib/workouts/exercises/bundledExerciseUsageExport";
import { parseStrengthIngestExercisesFromPayload } from "../../lib/data/workouts/parseWorkoutFromRawEvent";

type CliArgs = {
  uid: string;
  outDir: string;
  projectId: string | null;
  skipCustomDefinitions: boolean;
  maxRawEvents: number | null;
};

/** Same precedence as `services/api/src/firebaseAdmin.ts` (explicit project for Admin SDK). */
function projectIdFromEnv(): string | null {
  const id =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    "";
  return id.length > 0 ? id : null;
}

/** Tutorial / runbook placeholders that must not be sent to Firestore as a project id. */
function isDocPlaceholderProjectId(id: string): boolean {
  const s = id.trim();
  if (s.length === 0) return true;
  const lower = s.toLowerCase();
  if (lower === "your-staging-project-id") return true;
  if (/^<[^>]+>$/.test(s)) return true;
  return false;
}

/**
 * When no env / flag project is set, use `.firebaserc` → `projects.staging` (repo staging alias).
 * Ignores placeholder prod entries like `replace_with_prod_project_id`.
 */
function tryReadFirebasercStagingProject(repoRoot: string): string | undefined {
  try {
    const raw = readFileSync(path.join(repoRoot, ".firebaserc"), "utf8");
    const j = JSON.parse(raw) as { projects?: Record<string, string> };
    const id = j.projects?.staging?.trim();
    if (id != null && id.length > 0 && !id.includes("replace_with")) return id;
  } catch {
    /* missing or invalid */
  }
  return undefined;
}

function resolveFirestoreProjectId(cliOrEnvProjectId: string | null, repoRoot: string): string | undefined {
  const fromFlagOrEnv = cliOrEnvProjectId?.trim();
  if (fromFlagOrEnv != null && fromFlagOrEnv.length > 0 && !isDocPlaceholderProjectId(fromFlagOrEnv)) {
    return fromFlagOrEnv;
  }
  const fromRc = tryReadFirebasercStagingProject(repoRoot);
  if (fromRc != null) {
    if (fromFlagOrEnv != null && fromFlagOrEnv.length > 0 && isDocPlaceholderProjectId(fromFlagOrEnv)) {
      console.error(
        `[bundled-exercise-export] Ignoring placeholder project id "${fromFlagOrEnv}"; using .firebaserc projects.staging: ${fromRc}`,
      );
    }
    return fromRc;
  }
  if (fromFlagOrEnv != null && fromFlagOrEnv.length > 0) return fromFlagOrEnv;
  return undefined;
}

function parseArgs(argv: string[]): CliArgs | "help" | "usage" {
  const out: Omit<CliArgs, "uid"> & { uid: string | null } = {
    uid: null,
    outDir: path.join(process.cwd(), "artifacts", "bundled-exercise-usage"),
    projectId: projectIdFromEnv(),
    skipCustomDefinitions: false,
    maxRawEvents: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return "help";
    if (a === "--uid") out.uid = argv[++i]?.trim() ?? null;
    else if (a === "--out-dir") out.outDir = argv[++i] ?? "";
    else if (a === "--project-id") out.projectId = argv[++i]?.trim() ?? null;
    else if (a === "--skip-custom-definitions") out.skipCustomDefinitions = true;
    else if (a === "--max-raw-events") {
      const n = Number(argv[++i]);
      out.maxRawEvents = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    }
  }
  if (out.uid == null || out.uid.length === 0) return "usage";
  return out as CliArgs;
}

function printHelp(): void {
  console.log(`exportBundledExerciseUsage.cli.ts — read Firestore strength rawEvents and emit bundled usage JSON.

Required:
  --uid <FirebaseUid>

Optional:
  --out-dir <path>           default: ./artifacts/bundled-exercise-usage
  --project-id <id>          overrides env (see below)
  --skip-custom-definitions  do not load users/{uid}/exerciseDefinitions (resolver matches prod less closely)
  --max-raw-events <n>       stop after n strength_workout documents (testing)

Project id (same order as services/api firebaseAdmin.ts), then --project-id, else .firebaserc projects.staging:
  FIREBASE_PROJECT_ID, GOOGLE_CLOUD_PROJECT, GCLOUD_PROJECT

Environment:
  GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login
`);
}

function exerciseDefinitionRowToCustomExerciseRecord(r: ExerciseDefinitionRow): CustomExerciseRecord {
  return {
    exerciseId: r.exerciseId,
    name: r.name,
    equipment: r.equipment,
    primary: r.primary,
    loggingType: r.loggingType,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...(r.aliases != null ? { aliases: r.aliases } : {}),
    ...(r.movementPattern != null ? { movementPattern: r.movementPattern } : {}),
    ...(r.primaryMusclesDetailed != null ? { primaryMusclesDetailed: r.primaryMusclesDetailed } : {}),
    ...(r.secondaryMusclesDetailed != null ? { secondaryMusclesDetailed: r.secondaryMusclesDetailed } : {}),
    ...(r.muscleContributions != null ? { muscleContributions: r.muscleContributions } : {}),
    ...(r.imageUrl != null ? { imageUrl: r.imageUrl } : {}),
    ...(r.videoUrl != null ? { videoUrl: r.videoUrl } : {}),
    ...(r.mediaUrl != null ? { mediaUrl: r.mediaUrl } : {}),
  } as CustomExerciseRecord;
}

function rowToCustomExerciseRecord(raw: unknown): CustomExerciseRecord | null {
  const fs = exerciseDefinitionFirestoreDocSchema.safeParse(raw);
  if (fs.success) {
    const { schemaVersion: _unused, ...row } = fs.data;
    void _unused;
    return exerciseDefinitionRowToCustomExerciseRecord(row);
  }
  const row = exerciseDefinitionRowSchema.safeParse(raw);
  if (row.success) return exerciseDefinitionRowToCustomExerciseRecord(row.data);
  return null;
}

async function loadCustomExerciseById(uid: string, db: Firestore): Promise<Map<string, CustomExerciseRecord>> {
  const snap = await db.collection("users").doc(uid).collection("exerciseDefinitions").get();
  const m = new Map<string, CustomExerciseRecord>();
  for (const doc of snap.docs) {
    const rec = rowToCustomExerciseRecord(doc.data());
    if (rec != null) m.set(doc.id, rec);
  }
  return m;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed === "help") {
    printHelp();
    process.exit(0);
  }
  if (parsed === "usage") {
    console.error("Missing required --uid <FirebaseUid>");
    printHelp();
    process.exit(1);
  }

  const { uid, outDir, projectId: projectIdFromCliAndEnv, skipCustomDefinitions, maxRawEvents } = parsed;

  const resolvedFirestoreProjectId = resolveFirestoreProjectId(projectIdFromCliAndEnv, process.cwd());
  if (resolvedFirestoreProjectId != null) {
    console.error(`[bundled-exercise-export] Firestore project: ${resolvedFirestoreProjectId}`);
  } else {
    console.error(
      "[bundled-exercise-export] No explicit Firestore project id (set FIREBASE_PROJECT_ID / GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT, pass --project-id, or rely on repo-root .firebaserc projects.staging). Using Application Default Credentials default project.",
    );
  }

  if (!getApps().length) {
    initializeApp(resolvedFirestoreProjectId != null ? { projectId: resolvedFirestoreProjectId } : undefined);
  }

  const db = getFirestore();
  const customExerciseById =
    skipCustomDefinitions ? undefined : await loadCustomExerciseById(uid, db);
  const context = customExerciseById != null && customExerciseById.size > 0
    ? { customExerciseById }
    : undefined;

  const allExercises: { exerciseId: string; name: string }[] = [];
  let rawEventsProcessed = 0;

  const pageSize = 500;
  let last: QueryDocumentSnapshot | null = null;

  const base = db
    .collection("users")
    .doc(uid)
    .collection("rawEvents")
    .where("kind", "==", "strength_workout")
    .orderBy("observedAt", "asc");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q: FsQuery = base.limit(pageSize);
    if (last != null) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      if (maxRawEvents != null && rawEventsProcessed >= maxRawEvents) {
        last = null;
        break;
      }
      rawEventsProcessed += 1;
      const payloadRaw = doc.data()?.payload;
      const payload =
        payloadRaw != null && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)
          ? (payloadRaw as Record<string, unknown>)
          : null;
      if (payload == null) continue;

      const parsedExercises = parseStrengthIngestExercisesFromPayload(doc.id, payload);
      if (parsedExercises == null) continue;

      for (const ex of parsedExercises) {
        allExercises.push({ exerciseId: ex.exerciseId, name: ex.name });
      }
    }

    if (maxRawEvents != null && rawEventsProcessed >= maxRawEvents) break;

    last = snap.docs[snap.docs.length - 1]!;
    if (snap.size < pageSize) break;
  }

  const partial = aggregateBundledExerciseUsageFromStrengthExercises(allExercises, context);
  const agg = finalizeBundledExerciseUsageAggregation(partial, {
    strengthExerciseRowsProcessed: allExercises.length,
    rawEventsProcessed,
  });

  const generatedAt = new Date().toISOString();
  const meta = {
    generatedAt,
    uid,
    firestoreProjectId: resolvedFirestoreProjectId ?? null,
    source: {
      collection: `users/${uid}/rawEvents`,
      query: 'kind == "strength_workout"',
      orderedBy: "observedAt asc",
      note:
        "Distinct exercise rows come from parseStrengthIngestExercisesFromPayload (same as summaries). users/{uid}/events is not scanned.",
    },
    resolver: {
      bundledCatalog: "EXERCISE_LIBRARY_V1",
      analytics: "resolveExerciseIntelligenceForAnalytics + bundledExerciseIdsAmbiguousForAutoArchive",
      customDefinitionsLoaded: customExerciseById != null,
      customDefinitionCount: customExerciseById?.size ?? 0,
    },
    limits: maxRawEvents != null ? { maxRawEvents } : undefined,
  };

  await fs.mkdir(outDir, { recursive: true });

  const usedPath = path.join(outDir, "used-bundled-exercise-ids.json");
  await fs.writeFile(
    usedPath,
    JSON.stringify(
      {
        ...meta,
        exerciseIds: agg.bundledExerciseIdsUsed,
        count: agg.bundledExerciseIdsUsed.length,
        distinctStableExerciseIdsFromStrengthPayloads: agg.distinctStableExerciseIdsFromStrengthPayloads,
        distinctExerciseNamesFromStrengthHistory: agg.distinctExerciseNamesFromStrengthHistory,
        legacyNamesResolvedToBundledViaNameLookupOnly: agg.legacyNamesToBundledViaNameLookup,
        legacyNamesResolvedToBundledViaAnalyticsResolverForSyntheticRows:
          agg.legacyNamesToBundledViaAnalyticsResolver,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await fs.writeFile(
    path.join(outDir, "unresolved-legacy-exercise-names.json"),
    JSON.stringify(
      {
        ...meta,
        items: agg.unresolvedLegacyExerciseNames,
        count: agg.unresolvedLegacyExerciseNames.length,
        definition:
          'Exercise display names that appeared on rows with synthetic ids exercise:ingested:* where resolveExerciseIntelligenceForAnalytics(..., { fallbackLoggedExerciseName }) did not resolve to a bundled catalog id.',
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await fs.writeFile(
    path.join(outDir, "ambiguous-bundled-exercise-ids.json"),
    JSON.stringify(
      {
        ...meta,
        exerciseIds: agg.ambiguousBundledExerciseIds,
        count: agg.ambiguousBundledExerciseIds.length,
        definition:
          "bundledExerciseIdsAmbiguousForAutoArchive(): label collisions ∪ ids missing from all classification maps — excluded from unused-for-archive set.",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await fs.writeFile(
    path.join(outDir, "unused-bundled-exercise-ids.json"),
    JSON.stringify(
      {
        ...meta,
        exerciseIds: agg.unusedBundledExerciseIds,
        count: agg.unusedBundledExerciseIds.length,
        definition:
          "All EXERCISE_LIBRARY_V1 exerciseIds minus bundledExerciseIdsUsed minus ambiguousBundledExerciseIds. Custom exercise ids are never listed here.",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`Wrote export under ${outDir}`);
  console.log(
    JSON.stringify(
      {
        rawEventsProcessed,
        strengthExerciseRowsProcessed: allExercises.length,
        bundledUsedCount: agg.counts.bundledUsedCount,
        ambiguousCount: agg.counts.ambiguousCount,
        unusedCount: agg.counts.unusedCount,
        unresolvedLegacyNames: agg.unresolvedLegacyExerciseNames.length,
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
