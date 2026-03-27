import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Equipment, PrimaryBucket } from "./taxonomy";

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
