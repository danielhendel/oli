import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildStableCustomExerciseId,
  type ExerciseDefinitionLaterality,
  type ExerciseDefinitionRow,
  type ExerciseDefinitionStability,
} from "@oli/contracts";
import {
  getPrimaryMuscleGroupForExercise,
  getPrimaryMuscleGroupsFromContributionList,
} from "./muscleContributions";
import { resolveDeterministicMovementRedirect } from "./catalogMovementRedirects";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";
import type { MovementPattern } from "./metadata";
import type {
  Equipment,
  MuscleContribution,
  MuscleGroup,
  MuscleGroupDetailed,
  PrimaryBucket,
} from "./taxonomy";
import { isMuscleSubgroup, validateMuscleContributions } from "./taxonomy";
import { resolveStrengthLoggingType } from "./loggingType";

export type CustomExerciseLoggingType =
  | "weight_reps"
  | "reps_only"
  | "time"
  | "distance"
  | "bodyweight_reps"
  | "custom";

export type CustomExerciseRecord = {
  exerciseId: string;
  name: string;
  equipment: Equipment;
  primary: PrimaryBucket | "Other";
  loggingType: CustomExerciseLoggingType;
  createdAt: string;
  updatedAt: string;
  aliases?: string[];
  movementPattern?: MovementPattern;
  primaryMusclesDetailed?: MuscleGroupDetailed[];
  secondaryMusclesDetailed?: MuscleGroupDetailed[];
  muscleContributions?: MuscleContribution[];
  /** Machine-supported vs free-motion (see @oli/contracts exerciseDefinition). */
  stability?: ExerciseDefinitionStability | null;
  laterality?: ExerciseDefinitionLaterality | null;
  imageUrl?: string;
  videoUrl?: string;
  mediaUrl?: string;
};

const KEY_PREFIX = "workouts:customExercises:v1";

function key(uid: string): string {
  return `${KEY_PREFIX}:u:${uid}`;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isLoggingType(v: unknown): v is CustomExerciseLoggingType {
  return (
    v === "weight_reps" ||
    v === "reps_only" ||
    v === "time" ||
    v === "distance" ||
    v === "bodyweight_reps" ||
    v === "custom"
  );
}

function isEquipment(v: unknown): v is Equipment {
  return (
    v === "Barbell" ||
    v === "Dumbbell" ||
    v === "Kettlebell" ||
    v === "Machine" ||
    v === "Cable" ||
    v === "Bodyweight" ||
    v === "Band" ||
    v === "MedicineBall" ||
    v === "Sled" ||
    v === "CardioMachine" ||
    v === "Other"
  );
}

const MOVEMENT_PATTERN_SET = new Set<string>([
  "push",
  "pull",
  "squat",
  "hinge",
  "carry",
  "core",
  "isolation",
  "lunge",
  "rotation",
  "gait",
]);

function optionalMovementPattern(v: unknown): MovementPattern | undefined {
  return typeof v === "string" && MOVEMENT_PATTERN_SET.has(v) ? (v as MovementPattern) : undefined;
}

function optionalStringList(v: unknown, maxItems: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const el of v) {
    if (typeof el !== "string") continue;
    const s = el.trim();
    if (s.length === 0 || s.length > maxLen) continue;
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out.length > 0 ? out : undefined;
}

function optionalDetailedList(v: unknown): MuscleGroupDetailed[] | undefined {
  const list = optionalStringList(v, 40, 64);
  return list != null ? (list as MuscleGroupDetailed[]) : undefined;
}

function optionalMuscleContributions(v: unknown): MuscleContribution[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: MuscleContribution[] = [];
  for (const el of v) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const subgroup = typeof o.subgroup === "string" ? o.subgroup.trim() : "";
    const weight = typeof o.weight === "number" ? o.weight : Number.NaN;
    if (!isMuscleSubgroup(subgroup)) continue;
    if (!Number.isFinite(weight) || weight < 0) continue;
    out.push({ subgroup, weight });
  }
  if (out.length === 0) return undefined;
  return validateMuscleContributions(out) ? out : undefined;
}

const STABILITY_SET = new Set<string>(["machine", "free"]);
const LATERALITY_SET = new Set<string>(["unilateral", "bilateral"]);

function optionalStability(v: unknown): ExerciseDefinitionStability | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  return STABILITY_SET.has(v) ? (v as ExerciseDefinitionStability) : undefined;
}

function optionalLaterality(v: unknown): ExerciseDefinitionLaterality | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  return LATERALITY_SET.has(v) ? (v as ExerciseDefinitionLaterality) : undefined;
}

function optionalUrlField(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (s.length === 0 || s.length > 2048) return undefined;
  return s;
}

function isPrimary(v: unknown): v is PrimaryBucket | "Other" {
  return (
    v === "Chest" ||
    v === "Back" ||
    v === "Legs" ||
    v === "Shoulders" ||
    v === "Biceps" ||
    v === "Triceps" ||
    v === "Core" ||
    v === "Full body" ||
    v === "Other"
  );
}

function normalizeRecords(raw: unknown): CustomExerciseRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomExerciseRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const exerciseId = typeof row.exerciseId === "string" ? row.exerciseId.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const createdAt = typeof row.createdAt === "string" ? row.createdAt : "";
    const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : "";
    if (
      exerciseId.length === 0 ||
      name.length === 0 ||
      !isEquipment(row.equipment) ||
      !isPrimary(row.primary) ||
      !isLoggingType(row.loggingType) ||
      createdAt.length === 0 ||
      updatedAt.length === 0
    ) {
      continue;
    }
    const record: CustomExerciseRecord = {
      exerciseId,
      name,
      equipment: row.equipment,
      primary: row.primary,
      loggingType: row.loggingType,
      createdAt,
      updatedAt,
    };
    const aliases = optionalStringList(row.aliases, 40, 80);
    if (aliases != null) record.aliases = aliases;
    const movementPattern = optionalMovementPattern(row.movementPattern);
    if (movementPattern != null) record.movementPattern = movementPattern;
    const primaryMusclesDetailed = optionalDetailedList(row.primaryMusclesDetailed);
    if (primaryMusclesDetailed != null) record.primaryMusclesDetailed = primaryMusclesDetailed;
    const secondaryMusclesDetailed = optionalDetailedList(row.secondaryMusclesDetailed);
    if (secondaryMusclesDetailed != null) record.secondaryMusclesDetailed = secondaryMusclesDetailed;
    const muscleContributions = optionalMuscleContributions(row.muscleContributions);
    if (muscleContributions != null) record.muscleContributions = muscleContributions;
    const stability = optionalStability(row.stability);
    if (stability !== undefined) record.stability = stability;
    const laterality = optionalLaterality(row.laterality);
    if (laterality !== undefined) record.laterality = laterality;
    const imageUrl = optionalUrlField(row.imageUrl);
    if (imageUrl != null) record.imageUrl = imageUrl;
    const videoUrl = optionalUrlField(row.videoUrl);
    if (videoUrl != null) record.videoUrl = videoUrl;
    const mediaUrl = optionalUrlField(row.mediaUrl);
    if (mediaUrl != null) record.mediaUrl = mediaUrl;
    out.push(record);
  }
  return out;
}

export function sanitizeCustomExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

/** Maps API row → device record shape without assigning explicit `undefined` optional keys. */
export function customExerciseRecordFromDefinitionRow(row: ExerciseDefinitionRow): CustomExerciseRecord {
  const out: CustomExerciseRecord = {
    exerciseId: row.exerciseId,
    name: row.name,
    equipment: row.equipment,
    primary: row.primary,
    loggingType: row.loggingType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.aliases !== undefined) out.aliases = row.aliases;
  if (row.movementPattern !== undefined) out.movementPattern = row.movementPattern;
  if (row.primaryMusclesDetailed !== undefined) {
    out.primaryMusclesDetailed = row.primaryMusclesDetailed as MuscleGroupDetailed[];
  }
  if (row.secondaryMusclesDetailed !== undefined) {
    out.secondaryMusclesDetailed = row.secondaryMusclesDetailed as MuscleGroupDetailed[];
  }
  if (row.muscleContributions !== undefined) {
    out.muscleContributions = row.muscleContributions as MuscleContribution[];
  }
  if (row.stability !== undefined) out.stability = row.stability;
  if (row.laterality !== undefined) out.laterality = row.laterality;
  if (row.imageUrl !== undefined) out.imageUrl = row.imageUrl;
  if (row.videoUrl !== undefined) out.videoUrl = row.videoUrl;
  if (row.mediaUrl !== undefined) out.mediaUrl = row.mediaUrl;
  return out;
}

export async function listCustomExercises(uid: string): Promise<CustomExerciseRecord[]> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return [];
  return normalizeRecords(safeParse(raw));
}

async function writeCustomExercises(uid: string, rows: CustomExerciseRecord[]): Promise<void> {
  await AsyncStorage.setItem(key(uid), JSON.stringify(rows));
}

export async function createCustomExercise(
  uid: string,
  input: {
    name: string;
    equipment: Equipment;
    primary: PrimaryBucket | "Other";
    loggingType: CustomExerciseLoggingType;
  },
): Promise<CustomExerciseRecord> {
  const now = new Date().toISOString();
  const name = sanitizeCustomExerciseName(input.name);
  if (name.length === 0) {
    throw new Error("Exercise name is required.");
  }
  const existing = await listCustomExercises(uid);
  const existingIds = new Set(existing.map((x) => x.exerciseId));
  const exerciseId = buildStableCustomExerciseId(uid, name, existingIds);
  const row: CustomExerciseRecord = {
    exerciseId,
    name,
    equipment: input.equipment,
    primary: input.primary,
    loggingType: input.loggingType,
    createdAt: now,
    updatedAt: now,
  };
  await writeCustomExercises(uid, [...existing, row]);
  return row;
}

/**
 * Creates a user-owned custom exercise seeded from a bundled `EXERCISE_LIBRARY_V1` row.
 * Does not modify the bundled catalog. Caller should sync to backend via `createExerciseDefinition` when online.
 */
export async function createCustomExerciseSeededFromBundled(
  uid: string,
  bundledExerciseId: string,
): Promise<CustomExerciseRecord> {
  const item = EXERCISE_LIBRARY_V1.find((x) => x.exerciseId === bundledExerciseId);
  if (item == null) {
    throw new Error(`Not a bundled library exercise: ${bundledExerciseId}`);
  }
  const name = sanitizeCustomExerciseName(item.name);
  if (name.length === 0) {
    throw new Error("Exercise name is required.");
  }
  const existing = await listCustomExercises(uid);
  const existingIds = new Set(existing.map((x) => x.exerciseId));
  const exerciseId = buildStableCustomExerciseId(uid, name, existingIds);
  const loggingType = resolveStrengthLoggingType(bundledExerciseId) as CustomExerciseLoggingType;
  const now = new Date().toISOString();
  const row: CustomExerciseRecord = {
    exerciseId,
    name,
    equipment: item.equipment,
    primary: item.primaryBucket,
    loggingType,
    createdAt: now,
    updatedAt: now,
    movementPattern: item.movement,
  };
  if (item.aliases.length > 0) {
    row.aliases = [...item.aliases];
  }
  if (item.primaryDetailed.length > 0) {
    row.primaryMusclesDetailed = [...item.primaryDetailed];
  }
  if (item.secondaryDetailed.length > 0) {
    row.secondaryMusclesDetailed = [...item.secondaryDetailed];
  }
  await writeCustomExercises(uid, [...existing, row]);
  return row;
}

export type CustomExerciseUpdatePatch = Partial<
  Omit<CustomExerciseRecord, "exerciseId" | "createdAt">
> & { updatedAt?: string };

/**
 * Updates a device-local custom exercise row (AsyncStorage). Used after API edits and for offline-first UX.
 */
export async function updateCustomExercise(
  uid: string,
  exerciseId: string,
  patch: CustomExerciseUpdatePatch,
): Promise<CustomExerciseRecord | null> {
  const id = exerciseId.trim();
  if (id.length === 0) return null;
  const rows = await listCustomExercises(uid);
  const idx = rows.findIndex((r) => r.exerciseId === id);
  if (idx < 0) return null;
  const cur = rows[idx]!;
  const nextUpdatedAt = patch.updatedAt ?? new Date().toISOString();
  const { updatedAt: _ignoreUpdatedAt, ...restPatch } = patch;
  void _ignoreUpdatedAt;
  const next: CustomExerciseRecord = { ...cur, ...restPatch, updatedAt: nextUpdatedAt };
  const copy = [...rows];
  copy[idx] = next;
  await writeCustomExercises(uid, copy);
  return next;
}

/** Deterministic spelling fixes for legacy logged names (exact tokens only). */
function applyDeterministicLegacyTypoRewrites(raw: string): string {
  let s = raw;
  s = s.replace(/\baresenal\b/gi, "arsenal");
  s = s.replace(/\bstrentgh\b/gi, "strength");
  s = s.replace(/\bhanmer\b/gi, "hammer");
  s = s.replace(/\bimcline\b/gi, "incline");
  s = s.replace(/\bextebsions\b/gi, "extensions");
  return s;
}

/**
 * Strip gym brands / stack labels before alias + catalog matching (deterministic word list).
 */
function stripGymBrandAndDescriptorNoise(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/-/g, " ");
  // Preserve disambiguation vs flat bench: "Smith Machine Bench Press" → "smith bench press", not "bench press".
  s = s.replace(/\bsmith\s+machine\b/gi, "smith");
  const noise: RegExp[] = [
    /\bhammer\s+strength\b/gi,
    /\blife\s+fitness\b/gi,
    /\bhoist\b/gi,
    /\batlantis\b/gi,
    /\bcybex\b/gi,
    /\barsenal\b/gi,
    /\bnautilus\b/gi,
    /\bprecor\b/gi,
    /\bmatrix\b/gi,
    /\btechnogym\b/gi,
    /\bplate\s+loaded\b/gi,
    /\bmachine\b/gi,
    /\blinear\b/gi,
    /\bangled\b/gi,
    /\biso[\s-]lateral\b/gi,
    /\biso\b/gi,
  ];
  for (const re of noise) s = s.replace(re, " ");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Conservative normalization for **library** strings when building the catalog map (no brand/machine stripping).
 */
function normalizeLibraryEntryForMapKey(input: string): string {
  let s = input.trim().toLowerCase().replace(/-/g, " ");
  s = s.replace(/[\u2018\u2019\u201c\u201d]/g, "'");
  s = s.replace(
    /\(\s*(kettlebells?|kbs?|ez\s*bars?|straight\s*bars?|straight\s*bar|trap\s*bars?|trap\s*bar|cables?|ropes?|bands?|smith\s*machine|close\s*grips?)\s*\)/gi,
    " ",
  );
  s = s.replace(/[,•]/g, " ");
  s = s.replace(/[\s_-]+/g, " ");
  return s.trim();
}

/**
 * Aggressive normalization for **logged** exercise names (`resolveCatalogExerciseIdByName`).
 * Strips brands/machine noise → curly quotes → listed parenthetical equipment tags → collapse whitespace.
 */
export function normalizeExerciseNameForCatalogLookup(input: string): string {
  let s = applyDeterministicLegacyTypoRewrites(input.trim());
  s = stripGymBrandAndDescriptorNoise(s);
  s = s.replace(/[\u2018\u2019\u201c\u201d]/g, "'");
  // Strip parenthetical equipment/modifier tags users append to logged names (does not strip (barbell)/(dumbbell) etc.)
  s = s.replace(
    /\(\s*(kettlebells?|kbs?|ez\s*bars?|straight\s*bars?|straight\s*bar|trap\s*bars?|trap\s*bar|cables?|ropes?|bands?|smith\s*machine|close\s*grips?)\s*\)/gi,
    " ",
  );
  s = s.replace(/\(\s*\)/g, " ");
  s = s.replace(/\b(bicep|biceps)\s+curls\b/gi, "$1 curl");
  s = s.replace(/\bhamstring curls\b/gi, "hamstring curl");
  s = s.replace(/\bsitting\b/g, "seated");
  s = s.replace(/[,•]/g, " ");
  s = s.replace(/[\s_-]+/g, " ");
  return s.trim();
}

const CATALOG_EXERCISE_ID_BY_NORMALIZED_NAME: ReadonlyMap<string, string> = (() => {
  const out = new Map<string, string>();
  const addAllKeysForLabel = (label: string, exerciseId: string): void => {
    const conservative = normalizeLibraryEntryForMapKey(label);
    const aggressive = normalizeExerciseNameForCatalogLookup(label);
    for (const k of [conservative, aggressive]) {
      if (k.length === 0) continue;
      if (!out.has(k)) out.set(k, exerciseId);
    }
  };
  for (const entry of EXERCISE_LIBRARY_V1) {
    addAllKeysForLabel(entry.name, entry.exerciseId);
    for (const alias of entry.aliases) {
      addAllKeysForLabel(alias, entry.exerciseId);
    }
  }
  return out;
})();

/** Best-effort canonical catalog id lookup from free-text custom exercise name. */
export function resolveCatalogExerciseIdByName(name: string): string | null {
  const kAgg = normalizeExerciseNameForCatalogLookup(name);
  const kLib = normalizeLibraryEntryForMapKey(name);
  const keyForRedirect = kAgg.length > 0 ? kAgg : kLib;
  return (
    (kAgg.length > 0 ? CATALOG_EXERCISE_ID_BY_NORMALIZED_NAME.get(kAgg) : null) ??
    (kLib.length > 0 ? CATALOG_EXERCISE_ID_BY_NORMALIZED_NAME.get(kLib) : null) ??
    (keyForRedirect.length > 0 ? resolveDeterministicMovementRedirect(keyForRedirect) : null)
  );
}

/** Name or optional aliases → bundled catalog id (full library, including archived/retired). */
export function resolveCatalogExerciseIdFromCustomRecord(row: CustomExerciseRecord): string | null {
  const fromName = resolveCatalogExerciseIdByName(row.name);
  if (fromName != null) return fromName;
  const aliases = row.aliases;
  if (aliases == null) return null;
  for (const alias of aliases) {
    const hit = resolveCatalogExerciseIdByName(alias);
    if (hit != null) return hit;
  }
  return null;
}

function fallbackMuscleGroupFromPrimaryBucket(primary: PrimaryBucket | "Other"): MuscleGroup | null {
  if (primary === "Chest") return "chest";
  if (primary === "Back") return "back";
  if (primary === "Shoulders") return "shoulders";
  if (primary === "Triceps") return "triceps";
  if (primary === "Biceps") return "biceps";
  if (primary === "Core") return "core";
  // "Legs", "Full body", "Other" are too coarse to deterministically pick one top-level subgroup.
  return null;
}

/**
 * Resolve custom exercise to the best primary top-level muscle group for Sets tab:
 * 1) map custom name to a catalog exercise (name/alias) and use canonical contribution primary
 * 2) fallback to explicit custom `primary` bucket when it maps 1:1 to a top-level group
 */
export function resolveCustomExercisePrimaryMuscleGroup(row: CustomExerciseRecord): MuscleGroup | null {
  if (row.muscleContributions != null && validateMuscleContributions(row.muscleContributions)) {
    const g = getPrimaryMuscleGroupsFromContributionList(row.muscleContributions)[0];
    if (g != null) return g;
  }
  const catalogExerciseId = resolveCatalogExerciseIdByName(row.name);
  if (catalogExerciseId != null) {
    const primary = getPrimaryMuscleGroupForExercise(catalogExerciseId);
    if (primary != null) return primary;
  }
  return fallbackMuscleGroupFromPrimaryBucket(row.primary);
}
