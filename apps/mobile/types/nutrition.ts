// File: apps/mobile/types/nutrition.ts
import { BaseDoc } from '@/types/common';

export interface NutritionLog extends BaseDoc {
  date: string;                 // ISO date
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  micros?: Record<string, number>; // e.g., { "vitamin_d_mcg": 10 }
  meals?: Array<{
    name?: string;
    time?: string; // "HH:mm"
    kcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    items?: Array<{
      label: string;
      qty: number;
      unit: string;
      kcal?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    }>;
  }>;
  notes?: string;
}
