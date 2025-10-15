// apps/mobile/types/common.ts
export type ID = string;
export type UID = string;
export type ISODate = string;        // e.g., "2025-10-14"
export type EpochMillis = number;    // Date.now()

export type Provider =
  | 'app'
  | 'apple-health'
  | 'oura'
  | 'withings'
  | 'fitbit'
  | 'manual';

export type DataDomain = 'workout' | 'cardio' | 'nutrition' | 'recovery' | 'upload' | 'labs' | 'dexascan';

export type UnitSystem = 'imperial' | 'metric';
export type WeightUnit = 'lb' | 'kg';
export type DistanceUnit = 'mi' | 'km';
export type EnergyUnit = 'kcal';
export type DurationUnit = 'sec' | 'min' | 'hr';

export type WeightPlacement = 'total' | 'each'; // total load vs per-side

export interface BaseDoc {
  id?: ID;
  uid: UID;
  createdAt: EpochMillis;
  updatedAt: EpochMillis;
  source?: Provider;
}
