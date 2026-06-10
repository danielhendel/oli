// lib/features/profile/digitalTwin/buildDigitalTwinPrioritiesVm.ts
// Pure builder for the Priorities section. Groups into Attention / Opportunities / Missing Data
// using ONLY verified server truths: HealthSignals.reasons + missingInputs, Insights items
// + severities, and systems that need data. No invented opportunity score.

import type {
  DigitalTwinSystemId,
  PrioritiesVm,
  PriorityGroupKey,
  PriorityRowVm,
  SystemVm,
  TwinDataContext,
} from "@/lib/features/profile/digitalTwin/types";

const EMPTY_COPY = "Nothing needs attention today.";

const DOMAIN_TO_SYSTEM: Record<string, DigitalTwinSystemId> = {
  recovery: "sleep-recovery",
  training: "fitness",
  nutrition: "metabolic",
  body: "body-composition",
};

const DOMAIN_LABEL: Record<string, string> = {
  recovery: "Recovery",
  training: "Training",
  nutrition: "Nutrition",
  body: "Body",
};

function systemHref(id: DigitalTwinSystemId): string {
  return `/(app)/profile/system/${id}`;
}

/** Map a HealthSignals reason code → human copy + target system. */
function describeReason(
  reason: string,
): { label: string; system: DigitalTwinSystemId } | null {
  const belowMatch = /^domain_(\w+)_below_threshold$/.exec(reason);
  if (belowMatch) {
    const domain = belowMatch[1] ?? "";
    const system = DOMAIN_TO_SYSTEM[domain];
    if (system) return { label: `${DOMAIN_LABEL[domain]} is below your usual range`, system };
  }
  const devMatch = /^domain_(\w+)_deviation_below_threshold$/.exec(reason);
  if (devMatch) {
    const domain = devMatch[1] ?? "";
    const system = DOMAIN_TO_SYSTEM[domain];
    if (system) return { label: `${DOMAIN_LABEL[domain]} dropped vs your baseline`, system };
  }
  if (reason === "composite_below_threshold") {
    return { label: "Overall health score is low", system: "cardiovascular" };
  }
  if (reason === "composite_deviation_below_threshold") {
    return { label: "Overall score dropped vs your baseline", system: "cardiovascular" };
  }
  if (reason === "missing_health_score") {
    return { label: "Add data to build your health score", system: "cardiovascular" };
  }
  return null;
}

/** Map a HealthSignals missingInput → human copy + target system. */
function describeMissingInput(
  input: string,
): { label: string; system: DigitalTwinSystemId } | null {
  if (input === "health_score") {
    return { label: "Add data to build your health score", system: "cardiovascular" };
  }
  const system = DOMAIN_TO_SYSTEM[input];
  const label = DOMAIN_LABEL[input];
  if (system && label) {
    return { label: `Add ${label.toLowerCase()} data`, system };
  }
  return null;
}

/** Map an insight (by tags/kind) → target system for navigation. */
function insightSystem(tags: string[] | undefined, kind: string): DigitalTwinSystemId {
  const all = [...(tags ?? []), kind];
  if (all.some((t) => t === "sleep" || t === "recovery" || t === "hrv")) return "sleep-recovery";
  if (all.some((t) => t === "training" || t === "activity" || t === "movement")) return "fitness";
  if (all.some((t) => t === "nutrition")) return "metabolic";
  return "cardiovascular";
}

export type BuildPrioritiesInput = {
  ctx: TwinDataContext;
  systems: SystemVm[];
};

export function buildDigitalTwinPrioritiesVm(input: BuildPrioritiesInput): PrioritiesVm {
  const { ctx, systems } = input;

  const attention: PriorityRowVm[] = [];
  const opportunities: PriorityRowVm[] = [];
  const missingData: PriorityRowVm[] = [];

  const seen = new Set<string>();
  const pushUnique = (arr: PriorityRowVm[], row: PriorityRowVm) => {
    const key = `${row.group}:${row.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    arr.push(row);
  };

  // 1. Critical / warning insights → Attention; info insights → Opportunities.
  if (ctx.insights.status === "ready") {
    for (const item of ctx.insights.data.items) {
      const system = insightSystem(item.tags, item.kind);
      const href = systemHref(system);
      if (item.severity === "critical" || item.severity === "warning") {
        pushUnique(attention, {
          id: `insight-${item.id}`,
          group: "attention",
          label: item.title,
          detail: item.message,
          href,
          accessibilityLabel: `${item.title}. ${item.message}`,
        });
      } else {
        pushUnique(opportunities, {
          id: `insight-${item.id}`,
          group: "opportunities",
          label: item.title,
          detail: item.message,
          href,
          accessibilityLabel: `${item.title}. ${item.message}`,
        });
      }
    }
  }

  // 2. HealthSignals reasons → Attention.
  if (ctx.healthSignals.status === "ready") {
    for (const reason of ctx.healthSignals.data.reasons) {
      const described = describeReason(reason);
      if (!described) continue;
      pushUnique(attention, {
        id: `reason-${reason}`,
        group: "attention",
        label: described.label,
        detail: null,
        href: systemHref(described.system),
        accessibilityLabel: described.label,
      });
    }

    // 3. HealthSignals missingInputs → Missing Data.
    for (const missing of ctx.healthSignals.data.missingInputs) {
      const described = describeMissingInput(missing);
      if (!described) continue;
      pushUnique(missingData, {
        id: `missing-${missing}`,
        group: "missingData",
        label: described.label,
        detail: null,
        href: systemHref(described.system),
        accessibilityLabel: described.label,
      });
    }
  }

  // 4. Trackable systems that need data with a CTA → Missing Data.
  for (const s of systems) {
    if (!s.needsData) continue;
    if (s.ctaRoute == null) continue;
    pushUnique(missingData, {
      id: `system-${s.id}`,
      group: "missingData",
      label: `${s.title}: ${s.needsData ? s.subtitle : s.description}`,
      detail: null,
      href: s.href,
      accessibilityLabel: `${s.title}. ${s.subtitle}`,
    });
  }

  const groups = [
    { key: "attention" as PriorityGroupKey, title: "Attention", rows: attention },
    { key: "opportunities" as PriorityGroupKey, title: "Opportunities", rows: opportunities },
    { key: "missingData" as PriorityGroupKey, title: "Missing Data", rows: missingData },
  ].filter((g) => g.rows.length > 0);

  return {
    groups,
    isEmpty: groups.length === 0,
    emptyCopy: EMPTY_COPY,
  };
}
