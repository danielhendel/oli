// lib/features/profile/digitalTwin/buildDigitalTwinOverviewVm.ts
// Pure builder for the Digital Twin Overview card. Surfaces existing server truths only:
// HealthScore composite + tier, HealthSignals status, and derived completeness counts.
// No invented scores. Avoids fake zeroes when data is insufficient.

import { formatHealthScoreTier } from "@/lib/format/healthScore";
import type {
  CompletenessVm,
  OverviewVm,
  TwinDataContext,
} from "@/lib/features/profile/digitalTwin/types";

export type BuildOverviewInput = {
  ctx: TwinDataContext;
  completeness: CompletenessVm;
  loading: boolean;
};

function resolveLastUpdated(ctx: TwinDataContext): string | null {
  if (ctx.healthScore.status === "ready") return ctx.healthScore.data.computedAt;
  if (ctx.dailyFacts.status === "ready") {
    return ctx.dailyFacts.data.meta?.computedAt ?? ctx.dailyFacts.data.computedAt ?? null;
  }
  return null;
}

export function buildDigitalTwinOverviewVm(input: BuildOverviewInput): OverviewVm {
  const { ctx, completeness, loading } = input;

  const healthScore =
    ctx.healthScore.status === "ready" ? ctx.healthScore.data : null;
  const insufficientData =
    healthScore !== null && healthScore.status === "insufficient_data";

  const compositeScore =
    healthScore !== null && !insufficientData
      ? Math.round(healthScore.compositeScore)
      : null;
  const compositeTierLabel =
    healthScore !== null && !insufficientData
      ? formatHealthScoreTier(healthScore.compositeTier)
      : null;

  const signalStatusLabel =
    ctx.healthSignals.status === "ready"
      ? ctx.healthSignals.data.status === "stable"
        ? "Stable"
        : "Attention Required"
      : null;
  const signalAttention =
    ctx.healthSignals.status === "ready" &&
    ctx.healthSignals.data.status === "attention_required";

  const { systemsWithData, systemsNeedingData, systemsTrackable } = completeness;

  const completenessLabel =
    systemsNeedingData > 0
      ? `${systemsWithData} of ${systemsTrackable} systems tracked · ${systemsNeedingData} need data`
      : `${systemsWithData} of ${systemsTrackable} systems tracked`;

  return {
    compositeScore,
    compositeTierLabel,
    signalStatusLabel,
    signalAttention,
    insufficientData,
    systemsTracked: systemsWithData,
    systemsNeedingData,
    systemsTrackable,
    completenessLabel,
    lastUpdated: resolveLastUpdated(ctx),
    loading,
    signedOut: ctx.signedOut,
  };
}
