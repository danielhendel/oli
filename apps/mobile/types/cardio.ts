// File: apps/mobile/types/cardio.ts
import { BaseDoc } from '@/types/common';

export interface CardioLog extends BaseDoc {
  date: string;                 // ISO date
  modality: 'run' | 'walk' | 'cycle' | 'row' | 'swim' | 'other';
  distance?: number;            // normalized km
  durationMin?: number;
  avgHr?: number;
  maxHr?: number;
  elevationGainM?: number;
  rpe?: number;
  splits?: Array<{ km: number; paceSecPerKm: number }>;
  notes?: string;
}
