// lib/features/profile/healthRecordCategories.ts
// Health record sections for Profile digital twin — sourced from former Manage tab taxonomy.

export type RecordState = "Implemented" | "Partial" | "Missing";

export type HealthRecordGroup = "Health Systems" | "Clinical Records" | "Record Integrity";

export type HealthRecordCategory = {
  id: string;
  title: string;
  /** Short UX description shown on Profile cards. */
  description: string;
  group: HealthRecordGroup;
  recordState: RecordState;
  /** Expo Router href when the area has a primary screen. */
  route?: `/${string}` | `/(app)${string}`;
};

/**
 * Full health record category list (same taxonomy as the former Manage tab), with human descriptions.
 * `route` only when navigation exists in-app.
 */
export const HEALTH_RECORD_CATEGORIES: readonly HealthRecordCategory[] = [
  {
    id: "body",
    title: "Body & structural",
    description: "Weight, composition, and structural metrics tied to your body.",
    group: "Health Systems",
    recordState: "Implemented",
    route: "/(app)/body",
  },
  {
    id: "cardiovascular",
    title: "Cardiovascular",
    description: "Heart, vessels, activity load, and related vitals.",
    group: "Health Systems",
    recordState: "Partial",
    route: "/(app)/recovery/readiness",
  },
  {
    id: "respiratory",
    title: "Respiratory",
    description: "Breathing, lung function, and oxygenation when available.",
    group: "Health Systems",
    recordState: "Missing",
  },
  {
    id: "digestive",
    title: "Digestive",
    description: "GI symptoms and digestive screening signals.",
    group: "Health Systems",
    recordState: "Missing",
  },
  {
    id: "endocrine",
    title: "Endocrine & hormonal",
    description: "Thyroid, sex hormones, cortisol, and metabolic hormones.",
    group: "Health Systems",
    recordState: "Missing",
  },
  {
    id: "musculoskeletal",
    title: "Strength training",
    description: "Resistance training volume, frequency, and workload.",
    group: "Health Systems",
    recordState: "Implemented",
    route: "/(app)/workouts",
  },
  {
    id: "cardio-activity",
    title: "Cardio activity",
    description: "Runs, rides, and structured cardio sessions.",
    group: "Health Systems",
    recordState: "Implemented",
    route: "/(app)/cardio",
  },
  {
    id: "sleep",
    title: "Sleep & circadian",
    description: "Sleep duration, timing, and recovery-linked sleep signals.",
    group: "Health Systems",
    recordState: "Implemented",
    route: "/(app)/recovery/sleep",
  },
  {
    id: "nutrition",
    title: "Nutrition & metabolism",
    description: "Intake, macros, and nutrition-linked metabolism signals.",
    group: "Health Systems",
    recordState: "Implemented",
    route: "/(app)/nutrition",
  },
  {
    id: "recovery",
    title: "Recovery & autonomic",
    description: "HRV, readiness, and autonomic balance.",
    group: "Health Systems",
    recordState: "Implemented",
    route: "/(app)/recovery/readiness",
  },
  {
    id: "labs",
    title: "Labs & biomarkers",
    description: "Lab panels and biomarker results in your record.",
    group: "Health Systems",
    recordState: "Implemented",
    route: "/(app)/labs",
  },
  {
    id: "immune",
    title: "Immune & inflammation",
    description: "Inflammation markers and immune-related labs.",
    group: "Health Systems",
    recordState: "Missing",
  },
  {
    id: "mental",
    title: "Mental & cognitive",
    description: "Mood, fatigue, and cognitive check-ins when supported.",
    group: "Health Systems",
    recordState: "Missing",
  },
  {
    id: "medications",
    title: "Medications & supplements",
    description: "Prescriptions, OTC meds, and supplements.",
    group: "Clinical Records",
    recordState: "Missing",
  },
  {
    id: "conditions",
    title: "Conditions & diagnoses",
    description: "Conditions, diagnoses, and care context.",
    group: "Clinical Records",
    recordState: "Missing",
  },
  {
    id: "imaging",
    title: "Imaging & documents",
    description: "Uploads, imaging, and document-backed reports.",
    group: "Clinical Records",
    recordState: "Partial",
    route: "/(app)/labs/upload",
  },
  {
    id: "data-quality",
    title: "Data quality",
    description: "Import issues, uncertain records, and integrity signals.",
    group: "Record Integrity",
    recordState: "Implemented",
    route: "/(app)/failures",
  },
] as const;

/** Maps collapsed PHR row id → metric accordion config id in {@link MANAGE_METRIC_MAP}. */
export const CATEGORY_ID_TO_METRIC_CATEGORY_ID: Record<string, string> = {
  body: "body-structural",
  cardiovascular: "cardiovascular",
  /** Cardio activity shares activity/HRV metrics with cardiovascular in DailyFacts. */
  "cardio-activity": "cardiovascular",
  respiratory: "respiratory",
  digestive: "digestive",
  endocrine: "endocrine-hormonal",
  musculoskeletal: "musculoskeletal",
  sleep: "sleep-circadian",
  nutrition: "nutrition-metabolism",
  recovery: "recovery-autonomic",
  labs: "labs-biomarkers",
  immune: "immune-inflammation",
  mental: "mental-cognitive",
  medications: "medications-supplements",
  conditions: "conditions-diagnoses",
  imaging: "imaging-documents",
  "data-quality": "data-quality",
};
