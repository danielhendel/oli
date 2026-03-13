// lib/metrics/metricRanges.ts
// Bar range configs for metric progress bars (min/max and optional inversion).

export type BarRange = { min: number; max: number; inverted?: boolean };

export const METRIC_BAR_RANGES: Record<string, BarRange> = {
  weight: { min: 40, max: 150 },
  "body-fat-percent": { min: 5, max: 50 },
  hrv: { min: 20, max: 100 },
  "recovery-hrv": { min: 20, max: 100 },
  steps: { min: 0, max: 15000 },
  "activity-minutes": { min: 0, max: 120 },
  "sleep-duration": { min: 180, max: 600 },
  calories: { min: 0, max: 3000 },
  protein: { min: 0, max: 150 },
  "lab-results-count": { min: 0, max: 50 },
  uploads: { min: 0, max: 20 },
  "open-issues": { min: 0, max: 20, inverted: true },
};
