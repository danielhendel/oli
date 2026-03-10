/**
 * Gym/facility registry for workouts.
 * Pure, typed derivation: gym equipment inventory + exercise metadata.equipment
 * to determine exercise availability. No hardcoding of exercise IDs to gyms.
 */

import type {
  CardioSubtype,
  Equipment,
  MachineSubtype,
} from "@/lib/workouts/exercises/taxonomy";
import { getExerciseMeta } from "@/lib/workouts/exercises/metadata";

/** Stable gym identifier (e.g. from preferences.selectedGymId). */
export type GymId = string;

/** Facility profile: id, display name, and equipment available at the gym. */
export type GymProfile = {
  id: GymId;
  name: string;
  /** Equipment types available at this gym. Uses taxonomy Equipment. */
  availableEquipment: readonly Equipment[];
  /**
   * Optional: specific machine types. When set, exercises with equipment "Machine"
   * and equipmentSubtype are only available if subtype is in this list.
   * When undefined/empty: fail-open (treat as "all machines available" for backward compat).
   */
  availableMachineSubtypes?: readonly MachineSubtype[];
  /**
   * Optional: specific cardio types. When set, exercises with equipment "CardioMachine"
   * and equipmentSubtype are only available if subtype is in this list.
   * When undefined/empty: fail-open (treat as "all cardio available").
   */
  availableCardioSubtypes?: readonly CardioSubtype[];
  /**
   * Whether this gym should appear in the user-facing selector.
   * Defaults to true when omitted; test/demo gyms can set this to false.
   */
  userSelectable?: boolean;
};

/** Registry of known gyms and their equipment. Extend here when adding gyms. */
const GYM_REGISTRY: Record<string, GymProfile> = {
  edge_fitness_manchester_ct: {
    id: "edge_fitness_manchester_ct",
    name: "Edge Fitness Manchester CT",
    availableEquipment: [
      "Barbell",
      "Dumbbell",
      "Machine",
      "Cable",
      "Bodyweight",
      "Kettlebell",
      "Band",
      "MedicineBall",
      "Sled",
      "CardioMachine",
      "Other",
    ],
    /**
     * Assumption: Edge is our "full commercial gym" baseline.
     * We model a conservative but explicit set of machine/cardio subtypes that are
     * widely available in this type of facility. New subtypes should be reviewed
     * before being added here.
     */
    availableMachineSubtypes: [
      "LegPress",
      "LegExtension",
      "LegCurl",
      "CalfRaise",
      "ChestPress",
      "PecFly",
      "ShoulderPress",
      "LateralRaise",
      "RearDeltFly",
      "Pulldown",
      "Row",
      "BicepCurl",
      "PreacherCurl",
      "TricepDip",
      "HipAbduction",
      "HipAdduction",
      "BackExtension",
    ],
    availableCardioSubtypes: ["Treadmill", "StationaryBike", "Elliptical", "StairClimber"],
  },
  /** Minimal gym for derivation tests and "bodyweight only" users. */
  bodyweight_only_home: {
    id: "bodyweight_only_home",
    name: "Bodyweight only (home)",
    availableEquipment: ["Bodyweight"],
  },
  /** Test gym: Machine + Bodyweight but only some machine subtypes (subtype-aware derivation). */
  limited_machines_gym: {
    id: "limited_machines_gym",
    name: "Limited machines (test)",
    availableEquipment: ["Machine", "Bodyweight"],
    availableMachineSubtypes: ["ChestPress", "Pulldown"],
    userSelectable: false,
  },
};

/**
 * Returns the gym profile for a given id, or null if unknown.
 */
export function getGymProfile(gymId: string | null): GymProfile | null {
  if (gymId == null || gymId === "") return null;
  return GYM_REGISTRY[gymId] ?? null;
}

/**
 * Display label for the selected gym. Use for overview and picker UI.
 * null/empty => "No gym"; known gym => profile.name; unknown => id fallback.
 */
export function getGymLabel(gymId: string | null): string {
  if (gymId == null || gymId === "") return "No gym";
  const profile = getGymProfile(gymId);
  return profile?.name ?? gymId;
}

/** Options for gym selection menu (No gym + user-selectable gyms). Order: No gym first, then by gym id. */
export function getGymMenuOptions(): { value: string | null; label: string }[] {
  const gyms = Object.values(GYM_REGISTRY)
    .filter((g) => g.userSelectable !== false)
    .sort((a, b) => a.id.localeCompare(b.id));
  return [{ value: null, label: "No gym" }, ...gyms.map((g) => ({ value: g.id, label: g.name }))];
}

/**
 * Pure derivation: whether an exercise is available at the selected gym.
 * - selectedGymId === null: no restriction (fail-open), returns true.
 * - selectedGymId unknown (not in registry): fail-open, returns true (safest: do not hide exercises).
 * - known gym: base check is availableEquipment includes exercise's equipment.
 * - When exercise has equipmentSubtype (Machine or CardioMachine): if the gym lists
 *   availableMachineSubtypes / availableCardioSubtypes, the subtype must be in that list;
 *   if the gym does not list subtypes (undefined or empty), we fail-open and treat as available.
 */
export function isExerciseAvailableAtGym(
  selectedGymId: string | null,
  exerciseId: string,
): boolean {
  if (selectedGymId == null || selectedGymId === "") return true;
  const profile = getGymProfile(selectedGymId);
  if (profile == null) return true;
  const meta = getExerciseMeta(exerciseId);
  const set = new Set(profile.availableEquipment);
  if (!set.has(meta.equipment)) return false;
  if (meta.equipment === "Machine" && meta.equipmentSubtype != null) {
    const subs = profile.availableMachineSubtypes;
    if (subs != null && subs.length > 0)
      return subs.includes(meta.equipmentSubtype as MachineSubtype);
  }
  if (meta.equipment === "CardioMachine" && meta.equipmentSubtype != null) {
    const subs = profile.availableCardioSubtypes;
    if (subs != null && subs.length > 0)
      return subs.includes(meta.equipmentSubtype as CardioSubtype);
  }
  return true;
}
