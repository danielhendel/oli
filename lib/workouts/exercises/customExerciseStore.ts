import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPrimaryMuscleGroupForExercise } from "./muscleContributions";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";
import type { Equipment, MuscleGroup, PrimaryBucket } from "./taxonomy";

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
    out.push({
      exerciseId,
      name,
      equipment: row.equipment,
      primary: row.primary,
      loggingType: row.loggingType,
      createdAt,
      updatedAt,
    });
  }
  return out;
}

export function sanitizeCustomExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

function slugFromName(name: string): string {
  const slug = sanitizeCustomExerciseName(name)
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.length > 0 ? slug.slice(0, 48) : "exercise";
}

export async function listCustomExercises(uid: string): Promise<CustomExerciseRecord[]> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return [];
  return normalizeRecords(safeParse(raw));
}

async function writeCustomExercises(uid: string, rows: CustomExerciseRecord[]): Promise<void> {
  await AsyncStorage.setItem(key(uid), JSON.stringify(rows));
}

function buildStableExerciseId(
  uid: string,
  name: string,
  existingIds: Set<string>,
): string {
  const uidPart = uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase() || "user";
  const base = `custom_${uidPart}_${slugFromName(name)}`;
  if (!existingIds.has(base)) return base;
  let i = 2;
  for (;;) {
    const candidate = `${base}_${i}`;
    if (!existingIds.has(candidate)) return candidate;
    i += 1;
  }
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
  const exerciseId = buildStableExerciseId(uid, name, existingIds);
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

function normalizeLookupName(input: string): string {
  return input.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

const CATALOG_EXERCISE_ID_BY_NORMALIZED_NAME: ReadonlyMap<string, string> = (() => {
  const out = new Map<string, string>();
  for (const entry of EXERCISE_LIBRARY_V1) {
    out.set(normalizeLookupName(entry.name), entry.exerciseId);
    for (const alias of entry.aliases) {
      out.set(normalizeLookupName(alias), entry.exerciseId);
    }
  }
  return out;
})();

/** Best-effort canonical catalog id lookup from free-text custom exercise name. */
export function resolveCatalogExerciseIdByName(name: string): string | null {
  const keyName = normalizeLookupName(name);
  if (keyName.length === 0) return null;
  return CATALOG_EXERCISE_ID_BY_NORMALIZED_NAME.get(keyName) ?? null;
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
  const catalogExerciseId = resolveCatalogExerciseIdByName(row.name);
  if (catalogExerciseId != null) {
    const primary = getPrimaryMuscleGroupForExercise(catalogExerciseId);
    if (primary != null) return primary;
  }
  return fallbackMuscleGroupFromPrimaryBucket(row.primary);
}
