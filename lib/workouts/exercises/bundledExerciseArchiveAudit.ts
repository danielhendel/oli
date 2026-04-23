/**
 * Bundled exercise usage / archive audit helpers (offline, repo-only).
 *
 * Verified **read paths** for workout exercise references (for operator audit design):
 * - **Ingest / server:** `services/functions` normalization, `mapRawEventToCanonical`, strength payloads (`exerciseId`, parseStrengthIngest)
 * - **API:** `GET /users/me/raw-events`, workout day/month summaries (taxonomy rollups)
 * - **Client journal:** `lib/workouts/journal/store`, `sessionIndex`, `reducer` → `exerciseId` on blocks
 * - **Recent / popular:** `lib/workouts/exercises/librarySections.ts` (journal-derived ids)
 * - **Picker:** `EXERCISE_CATALOG_FOR_PICKER_V1` (`catalog.ts`) — active bundled only
 * - **Display / analytics:** `taxonomyResolve.ts`, `exerciseAnalyticsIntelligence.ts`, `classificationResolvers.ts`, strength aggregates
 * - **Tests / fixtures:** explicit `exerciseId` strings in `__tests__`, session engine tests
 *
 * This module does **not** query Firestore; it supports **safe** classification of:
 * - **Ambiguous:** duplicate normalized catalog labels (name/alias collisions across bundled rows)
 * - **Classification coverage:** bundled ids missing from every `*_CLASSIFICATION_BY_EXERCISE_ID` map (treated as ambiguous for auto-archive)
 */

import type { ExerciseLibraryItemV1 } from "./library.v1";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";
import { BACK_CLASSIFICATION_BY_EXERCISE_ID } from "./classificationsBack.v1";
import {
  BICEPS_CLASSIFICATION_BY_EXERCISE_ID,
  FOREARMS_CLASSIFICATION_BY_EXERCISE_ID,
  TRICEPS_CLASSIFICATION_BY_EXERCISE_ID,
} from "./classificationsArms.v1";
import { CHEST_CLASSIFICATION_BY_EXERCISE_ID } from "./classifications.v1";
import { SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID } from "./classificationsShoulders.v1";
import {
  CALVES_CLASSIFICATION_BY_EXERCISE_ID,
  GLUTES_CLASSIFICATION_BY_EXERCISE_ID,
  HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID,
  QUADS_CLASSIFICATION_BY_EXERCISE_ID,
} from "./classificationsLowerBody.v1";
import { CORE_CLASSIFICATION_BY_EXERCISE_ID } from "./classificationsCore.v1";

/** Same normalization as `search.ts` norm() for collision detection (labels only). */
export function normalizeCatalogLabelForAudit(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Bundled exercises that share a normalized name or alias string with another bundled exercise.
 * Legacy name resolution may be ambiguous for these labels — do **not** auto-archive based on name-only evidence.
 */
export function computeBundledCatalogAmbiguousExerciseIds(
  items: readonly ExerciseLibraryItemV1[] = EXERCISE_LIBRARY_V1,
): Set<string> {
  const labelToIds = new Map<string, Set<string>>();
  const add = (label: string, id: string) => {
    const k = normalizeCatalogLabelForAudit(label);
    if (k.length === 0) return;
    let set = labelToIds.get(k);
    if (set == null) {
      set = new Set();
      labelToIds.set(k, set);
    }
    set.add(id);
  };
  for (const row of items) {
    add(row.name, row.exerciseId);
    for (const a of row.aliases) add(a, row.exerciseId);
  }
  const ambiguous = new Set<string>();
  for (const ids of labelToIds.values()) {
    if (ids.size > 1) {
      for (const id of ids) ambiguous.add(id);
    }
  }
  return ambiguous;
}

/** Union of every exercise id that appears in any v1 classification slice map. */
export function collectAllClassificationMapExerciseIds(): Set<string> {
  const s = new Set<string>();
  const addRecord = (rec: Readonly<Record<string, unknown>>) => {
    for (const k of Object.keys(rec)) s.add(k);
  };
  addRecord(CHEST_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(BACK_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(BICEPS_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(TRICEPS_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(FOREARMS_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(QUADS_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(GLUTES_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(CALVES_CLASSIFICATION_BY_EXERCISE_ID);
  addRecord(CORE_CLASSIFICATION_BY_EXERCISE_ID);
  return s;
}

/**
 * Bundled library ids with **no** row in any classification map. Treat as **ambiguous for auto-archive**
 * (analytics/classification behavior may differ from fully classified exercises).
 */
export function findBundledExerciseIdsMissingFromAllClassificationMaps(
  items: readonly ExerciseLibraryItemV1[] = EXERCISE_LIBRARY_V1,
): string[] {
  const classified = collectAllClassificationMapExerciseIds();
  const missing: string[] = [];
  for (const row of items) {
    if (!classified.has(row.exerciseId)) missing.push(row.exerciseId);
  }
  missing.sort((a, b) => a.localeCompare(b));
  return missing;
}

/** Label collisions ∪ bundled rows with no classification slice row (never auto-archive from repo-only cues). */
export function bundledExerciseIdsAmbiguousForAutoArchive(
  items: readonly ExerciseLibraryItemV1[] = EXERCISE_LIBRARY_V1,
): Set<string> {
  const out = computeBundledCatalogAmbiguousExerciseIds(items);
  for (const id of findBundledExerciseIdsMissingFromAllClassificationMaps(items)) out.add(id);
  return out;
}
