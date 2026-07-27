/**
 * Metric-specific configuration for Phase 2F-C2 contributor detail experiences.
 * Shared structure + per-metric semantics. Exhaustive — no unknown metrics.
 */

import type { ReadinessRangeContributorKey } from "@oli/contracts/ouraVendor";

import type { DashReadinessMetricRowId } from "@/lib/data/dash/buildDashReadinessMetricRows";
import {
  BODY_TEMPERATURE_DETAIL_V1_ENV_KEY,
  isBodyTemperatureDetailV1Enabled,
} from "@/lib/data/readiness/bodyTemperatureDetailFlag";
import {
  HRV_BALANCE_DETAIL_V1_ENV_KEY,
  isHrvBalanceDetailV1Enabled,
} from "@/lib/data/readiness/hrvBalanceDetailFlag";
import type { ReadinessContributorDetailMetric } from "@/lib/data/readiness/readinessContributorDetailTypes";
import {
  RECOVERY_INDEX_DETAIL_V1_ENV_KEY,
  isRecoveryIndexDetailV1Enabled,
} from "@/lib/data/readiness/recoveryIndexDetailFlag";
import {
  SLEEP_BALANCE_DETAIL_V1_ENV_KEY,
  isSleepBalanceDetailV1Enabled,
} from "@/lib/data/readiness/sleepBalanceDetailFlag";

export type ReadinessContributorDetailConfig = {
  metricId: ReadinessContributorDetailMetric;
  rowId: DashReadinessMetricRowId;
  contributorKey: ReadinessRangeContributorKey;
  /** Legacy readiness route query param (kebab-case). */
  routeParam: string;
  title: string;
  supportingLabel: "Oura contributor score";
  accessibilityMetricName: string;
  envKey: string;
  isEnabled: () => boolean;
};

const SUPPORTING_LABEL = "Oura contributor score" as const;

export const READINESS_CONTRIBUTOR_DETAIL_CONFIG: Record<
  ReadinessContributorDetailMetric,
  ReadinessContributorDetailConfig
> = {
  hrv_balance: {
    metricId: "hrv_balance",
    rowId: "hrv_balance",
    contributorKey: "hrv_balance",
    routeParam: "hrv-balance",
    title: "HRV Balance",
    supportingLabel: SUPPORTING_LABEL,
    accessibilityMetricName: "HRV Balance",
    envKey: HRV_BALANCE_DETAIL_V1_ENV_KEY,
    isEnabled: isHrvBalanceDetailV1Enabled,
  },
  body_temperature: {
    metricId: "body_temperature",
    rowId: "body_temperature",
    contributorKey: "body_temperature",
    routeParam: "body-temperature",
    title: "Body Temperature",
    supportingLabel: SUPPORTING_LABEL,
    accessibilityMetricName: "Body Temperature",
    envKey: BODY_TEMPERATURE_DETAIL_V1_ENV_KEY,
    isEnabled: isBodyTemperatureDetailV1Enabled,
  },
  recovery_index: {
    metricId: "recovery_index",
    rowId: "recovery_index",
    contributorKey: "recovery_index",
    routeParam: "recovery-index",
    title: "Recovery Index",
    supportingLabel: SUPPORTING_LABEL,
    accessibilityMetricName: "Recovery Index",
    envKey: RECOVERY_INDEX_DETAIL_V1_ENV_KEY,
    isEnabled: isRecoveryIndexDetailV1Enabled,
  },
  sleep_balance: {
    metricId: "sleep_balance",
    rowId: "sleep_balance",
    contributorKey: "sleep_balance",
    routeParam: "sleep-balance",
    title: "Sleep Balance",
    supportingLabel: SUPPORTING_LABEL,
    accessibilityMetricName: "Sleep Balance",
    envKey: SLEEP_BALANCE_DETAIL_V1_ENV_KEY,
    isEnabled: isSleepBalanceDetailV1Enabled,
  },
};

export function readinessContributorDetailConfigFor(
  metric: ReadinessContributorDetailMetric,
): ReadinessContributorDetailConfig {
  return READINESS_CONTRIBUTOR_DETAIL_CONFIG[metric];
}

export function isReadinessContributorDetailV1Enabled(
  metric: ReadinessContributorDetailMetric,
): boolean {
  return READINESS_CONTRIBUTOR_DETAIL_CONFIG[metric].isEnabled();
}
