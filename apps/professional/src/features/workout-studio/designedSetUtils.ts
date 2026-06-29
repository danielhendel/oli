import { createId } from "./ids";
import type { WorkoutDesignedSet } from "./types";

function renumberSets(sets: WorkoutDesignedSet[]): WorkoutDesignedSet[] {
  return sets.map((set, index) => ({ ...set, setNumber: index + 1 }));
}

export function createDefaultDesignedSets(count = 3): WorkoutDesignedSet[] {
  return Array.from({ length: count }, (_, index) => ({
    setId: createId("set"),
    setNumber: index + 1,
    reps: null,
    repRange: "8-12",
    loadGuidance: "",
    rpeTarget: 8,
    rirTarget: 2,
    restSeconds: 90,
    tempo: "",
    notes: "",
  }));
}

export function addDesignedSet(sets: WorkoutDesignedSet[]): WorkoutDesignedSet[] {
  const last = sets[sets.length - 1];
  const next: WorkoutDesignedSet = {
    setId: createId("set"),
    setNumber: sets.length + 1,
    reps: last?.reps ?? null,
    repRange: last?.repRange ?? "8-12",
    loadGuidance: last?.loadGuidance ?? "",
    rpeTarget: last?.rpeTarget ?? 8,
    rirTarget: last?.rirTarget ?? 2,
    restSeconds: last?.restSeconds ?? 90,
    tempo: last?.tempo ?? "",
    notes: "",
  };
  return [...sets, next];
}

export function duplicateDesignedSet(
  sets: WorkoutDesignedSet[],
  setId: string,
): WorkoutDesignedSet[] {
  const source = sets.find((set) => set.setId === setId);
  if (!source) return sets;
  const copy: WorkoutDesignedSet = {
    ...source,
    setId: createId("set"),
    notes: source.notes ? `${source.notes} (copy)` : "",
  };
  const index = sets.findIndex((set) => set.setId === setId);
  const next = [...sets];
  next.splice(index + 1, 0, copy);
  return renumberSets(next);
}

export function removeDesignedSet(sets: WorkoutDesignedSet[], setId: string): WorkoutDesignedSet[] {
  if (sets.length <= 1) return sets;
  return renumberSets(sets.filter((set) => set.setId !== setId));
}

export function moveDesignedSet(
  sets: WorkoutDesignedSet[],
  setId: string,
  direction: "up" | "down",
): WorkoutDesignedSet[] {
  const index = sets.findIndex((set) => set.setId === setId);
  if (index < 0) return sets;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sets.length) return sets;
  const next = [...sets];
  const current = next[index];
  const swap = next[targetIndex];
  if (!current || !swap) return sets;
  next[index] = swap;
  next[targetIndex] = current;
  return renumberSets(next);
}

export function updateDesignedSet(
  sets: WorkoutDesignedSet[],
  setId: string,
  patch: Partial<WorkoutDesignedSet>,
): WorkoutDesignedSet[] {
  return sets.map((set) => (set.setId === setId ? { ...set, ...patch } : set));
}

export function applySetDesignToAllSets(
  sets: WorkoutDesignedSet[],
  sourceSetId: string,
): WorkoutDesignedSet[] {
  const source = sets.find((set) => set.setId === sourceSetId);
  if (!source) return sets;

  return sets.map((set) => ({
    ...set,
    repRange: source.repRange,
    loadGuidance: source.loadGuidance,
    rpeTarget: source.rpeTarget,
    rirTarget: source.rirTarget,
    restSeconds: source.restSeconds,
    tempo: source.tempo,
  }));
}

export function duplicateLastDesignedSet(sets: WorkoutDesignedSet[]): WorkoutDesignedSet[] {
  const last = sets[sets.length - 1];
  if (!last) return addDesignedSet(sets);
  return duplicateDesignedSet(sets, last.setId);
}
