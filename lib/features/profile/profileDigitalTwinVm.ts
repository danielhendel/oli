// lib/features/profile/profileDigitalTwinVm.ts
import type { HealthRecordCategory } from "@/lib/features/profile/healthRecordCategories";

export type ProfileDigitalTwinCategoryVm = {
  category: HealthRecordCategory;
  /** Collapsed summary line (recent values / counts). */
  subtitleLine: string;
  /** User-facing status chip: Logged, No data yet, Needs setup, Partial, Unavailable. */
  dataStatusLabel: string;
  /** e.g. "3/7 metrics" when the metric map defines supported fields. */
  coverageLabel: string | null;
  /** Baseline from DailyFacts when present. */
  baselineLabel: string | null;
  /** Expo Router href or null when no destination. */
  navigationHref: string | null;
  /** Extra empty-state explanation when the category has no route or no data. */
  emptyDetail: string;
};
