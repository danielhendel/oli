import { isProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignOptions";
import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";

/** Parse and validate a muscle-group id from an Expo Router search param. */
export function parseMuscleGroupRouteParam(
  raw: string | string[] | undefined,
): ProgramDesignMuscleGroup | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !isProgramDesignMuscleGroup(value)) return null;
  return value;
}
