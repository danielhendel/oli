// lib/features/profile/digitalTwin/buildDigitalTwinSystemVm.ts
// Pure builder: DigitalTwinSystem + TwinDataContext → SystemVm. No hooks, no Firebase.

import type {
  DigitalTwinSystem,
  MetricRowVm,
  SystemStatus,
  SystemVm,
  TwinDataContext,
} from "@/lib/features/profile/digitalTwin/types";
import { profileMetricFallbackHref } from "@/lib/features/profile/digitalTwin/resolveMetricDetailHref";
import { SYSTEM_TO_HEALTHSCORE_DOMAIN } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";

const STATUS_LABELS: Record<SystemStatus, string> = {
  strong: "Strong",
  good: "Good",
  watch: "Watch",
  needsData: "Needs Data",
  unavailable: "Unavailable",
};

function tierToStatus(tier: "excellent" | "good" | "fair" | "poor"): SystemStatus {
  if (tier === "excellent") return "strong";
  if (tier === "good") return "good";
  return "watch";
}

/** Derive status from server truths + data presence only. Never from an invented score. */
function deriveStatus(
  system: DigitalTwinSystem,
  ctx: TwinDataContext,
  hasAnyValue: boolean,
): SystemStatus {
  if (ctx.signedOut) return "unavailable";

  // Systems backed by a server-computed HealthScore domain follow that domain's tier.
  const domain = SYSTEM_TO_HEALTHSCORE_DOMAIN[system.id];
  if (domain && ctx.healthScore.status === "ready") {
    const hs = ctx.healthScore.data;
    if (hs.status === "insufficient_data") return hasAnyValue ? "watch" : "needsData";
    const d = hs.domainScores[domain];
    if (d.score === 0 && d.missing.length > 0 && !hasAnyValue) return "needsData";
    return tierToStatus(d.tier);
  }

  // All other systems: "good" once any data exists, else needs data.
  return hasAnyValue ? "good" : "needsData";
}

export function buildDigitalTwinSystemVm(
  system: DigitalTwinSystem,
  ctx: TwinDataContext,
): SystemVm {
  const href = `/(app)/profile/system/${system.id}`;

  const northStar = system.metrics.find((m) => m.tier === "northStar") ?? null;
  const mainMetric = northStar?.read ? northStar.read(ctx) : null;

  const rows: MetricRowVm[] = system.metrics
    .filter((m) => m.tier !== "northStar")
    .map((m) => {
      const value = m.read ? m.read(ctx) : null;
      const description = m.description ?? null;
      const detail = value ?? description ?? "coming soon";
      return {
        id: m.id,
        label: m.label,
        tier: m.tier,
        description,
        value,
        href: profileMetricFallbackHref(m.id),
        accessibilityLabel: `${m.label}, ${detail}`,
      };
    });

  const hasAnyValue =
    mainMetric != null || rows.some((r) => r.value != null);

  const status = deriveStatus(system, ctx, hasAnyValue);
  const needsData = status === "needsData";

  const subtitle = needsData ? system.needsDataCopy : system.description;

  const a11yParts = [system.title, STATUS_LABELS[status], mainMetric ?? subtitle].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );

  return {
    id: system.id,
    title: system.title,
    shortTitle: system.shortTitle,
    description: system.description,
    status,
    statusLabel: STATUS_LABELS[status],
    mainMetric,
    subtitle,
    rows,
    needsData,
    ctaRoute: system.ctaRoute,
    ctaLabel: system.ctaLabel,
    href,
    accessibilityLabel: `${a11yParts.join(". ")}. Double tap to open`,
  };
}

export { STATUS_LABELS as SYSTEM_STATUS_LABELS };
