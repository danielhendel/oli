// apps/mobile/types/workout.ts
import { BaseDoc, WeightPlacement, WeightUnit } from './common';

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'core' | 'full_body' | 'other';

export type MovementType = 'compound' | 'isolation' | 'olympic' | 'bodyweight' | 'machine' | 'cardio';

export interface SetEntry {
  setNumber: number;       // 1-based
  reps?: number;
  weight?: number;         // in kg (normalized)
  weightUnit?: WeightUnit; // echoed from UI for fidelity (optional)
  placement?: WeightPlacement; // total vs each side
  rpe?: number;            // 1–10
  restSec?: number;
  tempo?: string;          // e.g., "3-1-1"
  notes?: string;
  completed?: boolean;
}

export interface ExerciseEntry {
  name: string;                 // normalized name
  muscleGroups: MuscleGroup[];
  movementType?: MovementType;
  sets: SetEntry[];
  volumeKg?: number;            // derived convenience (sum reps * weight)
}

export interface WorkoutLog extends BaseDoc {
  date: string;                 // ISO date
  title?: string;
  focusAreas?: MuscleGroup[];
  durationMin?: number;
  sections?: Array<{
    type: 'warmup' | 'set' | 'superset' | 'circuit' | 'finisher' | 'cooldown';
    exercises: ExerciseEntry[];
  }>;
  totalVolumeKg?: number;       // derived convenience
  perceivedIntensity?: 'easy' | 'moderate' | 'hard' | 'max';
  notes?: string;
}
