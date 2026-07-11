/**
 * Pure helpers for Dash Oura Readiness contributor display rows.
 * Contributors on the readiness view are typically 0–100 scores (not physiological units).
 */

import {
  classifyOuraProviderScore,
  normalizeOuraScore0to100,
  type OuraRatingLabel,
} from "@/lib/format/ouraScore";

const EMPTY = "\u2014";
const NOT_AVAILABLE_A11Y = "Not available";

export type DashReadinessMetricRowId =
  | "resting_heart_rate"
  | "hrv_balance"
  | "body_temperature"
  | "recovery_index"
  | "sleep_balance";

export type DashReadinessMetricRow = {
  id: DashReadinessMetricRowId;
  label: string;
  displayValue: string;
  accessibilityValue: string;
  isAvailable: boolean;
};

export const DASH_READINESS_METRIC_SPECS: readonly {
  id: DashReadinessMetricRowId;
  label: string;
  contributorKey: string;
}[] = [
  { id: "resting_heart_rate", label: "Resting heart rate", contributorKey: "resting_heart_rate" },
  { id: "hrv_balance", label: "HRV balance", contributorKey: "hrv_balance" },
  { id: "body_temperature", label: "Body temperature", contributorKey: "body_temperature" },
  { id: "recovery_index", label: "Recovery index", contributorKey: "recovery_index" },
  { id: "sleep_balance", label: "Sleep balance", contributorKey: "sleep_balance" },
] as const;

function unavailableRow(
  id: DashReadinessMetricRowId,
  label: string,
): DashReadinessMetricRow {
  return {
    id,
    label,
    displayValue: EMPTY,
    accessibilityValue: NOT_AVAILABLE_A11Y,
    isAvailable: false,
  };
}

function tierRow(
  id: DashReadinessMetricRowId,
  label: string,
  tier: OuraRatingLabel,
): DashReadinessMetricRow {
  return {
    id,
    label,
    displayValue: tier,
    accessibilityValue: tier,
    isAvailable: true,
  };
}

/** Contributor score → product tier; never treat the score as BPM or °C. */
export function displayContributorTier(value: unknown): {
  displayValue: string;
  accessibilityValue: string;
  isAvailable: boolean;
} {
  const n = normalizeOuraScore0to100(value);
  if (n == null) {
    return { displayValue: EMPTY, accessibilityValue: NOT_AVAILABLE_A11Y, isAvailable: false };
  }
  const tier = classifyOuraProviderScore(n);
  return { displayValue: tier, accessibilityValue: tier, isAvailable: true };
}

/**
 * Prefer a trusted exact-day resting HR in bpm. Never label a contributor score as bpm.
 * When only a contributor score exists, show its tier.
 */
export function displayRestingHeartRateRow(args: {
  exactDayRestingHeartRateBpm: number | null | undefined;
  contributorScore: unknown;
}): DashReadinessMetricRow {
  const label = "Resting heart rate";
  const id = "resting_heart_rate" as const;
  const bpm = args.exactDayRestingHeartRateBpm;
  if (typeof bpm === "number" && Number.isFinite(bpm) && bpm >= 30 && bpm <= 220) {
    const rounded = Math.round(bpm);
    return {
      id,
      label,
      displayValue: `${rounded} bpm`,
      accessibilityValue: `${rounded} beats per minute`,
      isAvailable: true,
    };
  }
  const tier = displayContributorTier(args.contributorScore);
  if (!tier.isAvailable) return unavailableRow(id, label);
  return {
    id,
    label,
    displayValue: tier.displayValue,
    accessibilityValue: tier.accessibilityValue,
    isAvailable: true,
  };
}

/**
 * Prefer temperature deviation (°C) when present on the readiness payload/contributors.
 * Otherwise show the body_temperature contributor tier. Never invent “Baseline”.
 */
export function displayBodyTemperatureRow(args: {
  contributors: Record<string, unknown>;
}): DashReadinessMetricRow {
  const label = "Body temperature";
  const id = "body_temperature" as const;
  const deviationRaw =
    args.contributors.temperature_deviation ??
    args.contributors.temperatureDeviation ??
    args.contributors.temp_deviation;
  if (typeof deviationRaw === "number" && Number.isFinite(deviationRaw) && Math.abs(deviationRaw) < 10) {
    const sign = deviationRaw > 0 ? "+" : "";
    const text = `${sign}${deviationRaw.toFixed(1)}°C`;
    return {
      id,
      label,
      displayValue: text,
      accessibilityValue: text,
      isAvailable: true,
    };
  }
  const tier = displayContributorTier(args.contributors.body_temperature);
  if (!tier.isAvailable) return unavailableRow(id, label);
  return tierRow(id, label, tier.displayValue as OuraRatingLabel);
}

export function buildDashReadinessMetricRows(args: {
  contributors: Record<string, unknown>;
  exactDayRestingHeartRateBpm?: number | null;
}): DashReadinessMetricRow[] {
  return DASH_READINESS_METRIC_SPECS.map((spec) => {
    if (spec.id === "resting_heart_rate") {
      return displayRestingHeartRateRow({
        exactDayRestingHeartRateBpm: args.exactDayRestingHeartRateBpm,
        contributorScore: args.contributors[spec.contributorKey],
      });
    }
    if (spec.id === "body_temperature") {
      return displayBodyTemperatureRow({ contributors: args.contributors });
    }
    const tier = displayContributorTier(args.contributors[spec.contributorKey]);
    if (!tier.isAvailable) return unavailableRow(spec.id, spec.label);
    return {
      id: spec.id,
      label: spec.label,
      displayValue: tier.displayValue,
      accessibilityValue: tier.accessibilityValue,
      isAvailable: true,
    };
  });
}
