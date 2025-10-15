// apps/mobile/types/profiles.ts
import { BaseDoc, ISODate, UnitSystem, WeightUnit } from './common';

export interface ProfileGeneral extends BaseDoc {
  sex?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: ISODate;
  heightCm?: number;         // store normalized metric; UI can convert
  weightKg?: number;
  ethnicityOptional?: string; // optional, user-provided text
}

export interface TrainingGoals extends BaseDoc {
  primaryGoal: 'body_comp' | 'strength' | 'hypertrophy' | 'performance' | 'endurance' | 'general_health';
  secondaryGoals?: string[];
  targetWeightKg?: number;
  targetBodyFatPct?: number;
  notes?: string;
}

export interface TrainingExperience extends BaseDoc {
  trainingAgeYrs?: number;
  comfortLevel?: 'beginner' | 'intermediate' | 'advanced';
  preferredTime?: 'morning' | 'midday' | 'evening' | 'flexible';
  avgSessionMins?: number;
  weeklyFrequency?: number;
  sessionMix?: { strengthPct: number; conditioningPct: number; mobilityPct: number };
  equipment?: string[]; // available equipment keywords
}

export interface MetabolicActivity extends BaseDoc {
  bodyFatPctEstimate?: number;
  leanMassKgEstimate?: number;
  bmrMethod?: 'mifflin-st-jeor' | 'katch-mcardle' | 'harris-benedict' | 'custom';
  trainingIntensity?: 'low' | 'moderate' | 'high' | 'variable';
  dailyStepsEstimate?: number;
  unitPrefs?: { unitSystem: UnitSystem; weightUnit: WeightUnit };
}
