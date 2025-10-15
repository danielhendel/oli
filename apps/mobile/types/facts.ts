// apps/mobile/types/facts.ts
import { BaseDoc } from './common';

export interface FactDaily extends BaseDoc {
  date: string; // ISO date
  // rollups
  workout: {
    totalSets: number;
    totalReps: number;
    totalVolumeKg: number;
    durationMin?: number;
  };
  cardio: {
    distanceKm: number;
    durationMin: number;
  };
  nutrition: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG?: number;
  };
  recovery: {
    sleepHours?: number;
    hrvMsAvg?: number;
    readinessScoreAvg?: number;
  };
}

export interface FactWeekly extends BaseDoc {
  isoWeek: string; // e.g., "2025-W42"
  // same shape as daily, aggregated
  workout: { totalSets: number; totalReps: number; totalVolumeKg: number; durationMin?: number };
  cardio: { distanceKm: number; durationMin: number };
  nutrition: { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG?: number };
  recovery: { sleepHours?: number; hrvMsAvg?: number; readinessScoreAvg?: number };
}
