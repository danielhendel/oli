// lib/data/program/workoutProgramDesignStore.ts
/**
 * In-memory, client-side draft store for Workout Program Design.
 *
 * WHY THIS EXISTS: the Program Design flow spans several sibling stack screens
 * (landing + 5 setup pages). They must share one draft so selections made on a setup page
 * are reflected back on the landing card. There is no Program persistence boundary in the
 * repo yet (see lib/data/program/types.ts), and the trust boundary forbids Firebase/API
 * writes in screens. So this is a deliberately small, framework-agnostic external store.
 *
 * PERSISTENCE IS INTENTIONALLY DEFERRED: state is process-memory only. It survives
 * navigation within a session but resets on app reload. No IO is performed here. When a
 * Program persistence boundary is approved, this store becomes the local draft that a
 * `lib/data/program/useProgram*` hook reconciles with server truth.
 */
import { useSyncExternalStore } from "react";

import {
  buildWeeklySplitDays,
  WEEKLY_SPLIT_MAX_DAYS,
  WEEKLY_SPLIT_MIN_DAYS,
} from "@/lib/data/program/workoutProgramDesignOptions";
import type {
  ProgramDesignMuscleGroup,
  ProgramDesignTrainingLevel,
  WorkoutProgramDesignDraft,
  WorkoutProgramType,
} from "@/lib/data/program/workoutProgramDesignTypes";

/** The empty draft — every category in its "Not set" state. */
export function buildEmptyWorkoutProgramDesignDraft(): WorkoutProgramDesignDraft {
  return {
    type: null,
    trainingLevel: null,
    durationWeeks: null,
    muscleGroupVolume: {},
    weeklySplit: null,
  };
}

let currentDraft: WorkoutProgramDesignDraft = buildEmptyWorkoutProgramDesignDraft();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setDraft(next: WorkoutProgramDesignDraft): void {
  currentDraft = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): WorkoutProgramDesignDraft {
  return currentDraft;
}

function clampInt(value: number, min: number, max: number): number {
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

/** Imperative mutators. Each produces a new immutable draft and notifies subscribers. */
export const workoutProgramDesignStore = {
  getSnapshot,
  subscribe,
  /** Replace the entire draft (used by tests and reset flows). */
  reset(): void {
    setDraft(buildEmptyWorkoutProgramDesignDraft());
  },
  setType(type: WorkoutProgramType): void {
    setDraft({ ...currentDraft, type });
  },
  setTrainingLevel(trainingLevel: ProgramDesignTrainingLevel): void {
    setDraft({ ...currentDraft, trainingLevel });
  },
  setDurationWeeks(durationWeeks: number): void {
    setDraft({ ...currentDraft, durationWeeks });
  },
  setMuscleVolume(muscle: ProgramDesignMuscleGroup, sets: number): void {
    const next = { ...currentDraft.muscleGroupVolume };
    if (sets <= 0) {
      delete next[muscle];
    } else {
      next[muscle] = sets;
    }
    setDraft({ ...currentDraft, muscleGroupVolume: next });
  },
  /** Choose the number of training days, (re)building the day list and preserving names by position. */
  setWeeklySplitDayCount(rawDayCount: number): void {
    const dayCount = clampInt(rawDayCount, WEEKLY_SPLIT_MIN_DAYS, WEEKLY_SPLIT_MAX_DAYS);
    const previous = currentDraft.weeklySplit?.days ?? [];
    setDraft({
      ...currentDraft,
      weeklySplit: { dayCount, days: buildWeeklySplitDays(dayCount, previous) },
    });
  },
  /** Set the user-entered name/type for one split day (no-op if the split isn't configured). */
  setWeeklySplitDayName(dayId: string, name: string): void {
    const split = currentDraft.weeklySplit;
    if (!split) return;
    setDraft({
      ...currentDraft,
      weeklySplit: {
        ...split,
        days: split.days.map((day) => (day.id === dayId ? { ...day, name } : day)),
      },
    });
  },
} as const;

/** Subscribe a component to the live Program Design draft. */
export function useWorkoutProgramDesignDraft(): WorkoutProgramDesignDraft {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
