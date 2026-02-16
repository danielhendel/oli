import type { Timestamp } from "firebase/firestore";

/** ---------- Event Envelope (All Hubs) ---------- */
export type EventType = "workout" | "cardio" | "nutrition" | "recovery";

export type EventSource =
  | "manual"
  | "template"
  | "past"
  | "import:oura"
  | "import:withings"
  | "import:apple";

export interface EventMeta {
  source: EventSource;
  draft?: boolean;
  version: 1; // bump only on breaking payload changes
  createdAt?: Timestamp; // set at write time (serverTimestamp)
  editedAt?: Timestamp;  // set on update (serverTimestamp)
  idempotencyKey?: string; // for imports
}

export interface EventDoc<TPayload = unknown> {
  id?: string;
  type: EventType;
  ymd: string;      // YYYY-MM-DD
  payload: TPayload;
  meta: EventMeta;
}

/** ---------- Workout ---------- */
export interface WorkoutSet {
  reps?: number;
  weightKg?: number;
  rpe?: number; // 1..10
}

export interface WorkoutExercise {
  id?: string;         // optional link to catalog later
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutPayload {
  exercises: WorkoutExercise[];
  notes?: string;
}

/** ---------- Cardio ---------- */
export type CardioModality = "run" | "row" | "swim" | "cycle";

export interface CardioSummary {
  distanceKm?: number;
  durationMs?: number;
  elevationGainM?: number;
  avgHr?: number;
  avgPaceSecPerKm?: number;
  rpe?: number;
}

export interface CardioLap {
  idx: number;
  distanceKm?: number;
  durationMs?: number;
  avgHr?: number;
  avgPowerW?: number;
}

export interface CardioInterval {
  label?: string;
  target?: string; // free-form for now
  actual?: {
    durationMs?: number;
    distanceKm?: number;
    avgHr?: number;
    avgPowerW?: number;
  };
}

export interface CardioRoute {
  polyline?: string;
  samplingHz?: number;
  pointsRef?: string; // Storage path for full GPS
}

export interface CardioStreams {
  hr?: number[];
  powerW?: number[];
  cadence?: number[];
  paceSecPerKm?: number[];
}

export interface CardioPayload {
  modality: CardioModality;
  summary?: CardioSummary;
  laps?: CardioLap[];
  intervals?: CardioInterval[];
  route?: CardioRoute;
  streams?: CardioStreams;
  notes?: string;
}

/** ---------- Nutrition ---------- */
export interface FoodItem {
  name: string;
  brand?: string;
  barcode?: string;
  servingQty?: number;
  servingUnit?: string; // "g", "ml", etc
  nutrients?: {
    kcal?: number;
    proteinG?: number;
    carbG?: number;
    fatG?: number;
    fiberG?: number;
    sugarG?: number;
    sodiumMg?: number;
  };
}

export interface FoodEntry {
  itemId?: string;            // when referencing a catalog item
  inlineItem?: FoodItem;      // when logging free-form
  grams?: number;
  servings?: number;
  mealTag?: "breakfast" | "lunch" | "dinner" | "snack";
  notes?: string;
}

export interface NutritionTotals {
  kcal?: number;
  proteinG?: number;
  carbG?: number;
  fatG?: number;
  fiberG?: number;
  sodiumMg?: number;
}

export interface NutritionPayload {
  entries?: FoodEntry[];
  totals?: NutritionTotals; // may be computed or manual
  notes?: string;
}

/** ---------- Recovery ---------- */
export type SleepStageType = "wake" | "rem" | "light" | "deep";

export interface SleepStage {
  start: string; // ISO
  end: string;   // ISO
  stage: SleepStageType;
}

export interface RecoverySleep {
  totalMin?: number; // optional if stages are provided
  efficiency?: number; // 0..1
  stages?: SleepStage[];
}

export interface RecoveryPhysio {
  rhrBpm?: number;
  hrvMs?: number;
  respRate?: number;       // breaths/min
  skinTempCDelta?: number; // °C delta (can be negative)
}

export interface RecoveryReadiness {
  score?: number; // 0..100 (provider-defined)
  strain?: number;
  notes?: string;
}

export interface RecoveryPayload {
  sleep?: RecoverySleep;
  physio?: RecoveryPhysio;
  readiness?: RecoveryReadiness;
  naps?: Array<{ start: string; end: string }>;
  subjective?: {
    energy1to5?: number;
    stress1to5?: number;
    soreness1to5?: number;
    mood1to5?: number;
  };
  notes?: string;
}

/** ---------- Helper Unions (for utilities/tests) ---------- */
export type AnyPayload =
  | WorkoutPayload
  | CardioPayload
  | NutritionPayload
  | RecoveryPayload;

export type ValidationIssue = { path: string; message: string };
