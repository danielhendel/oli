import type { RawEventListItem } from "@oli/contracts";
import { manualWeightPayloadSchema } from "@oli/contracts";

import type { BodyHistoryMetricFilter } from "@/lib/data/body/bodyHistoryMetricFilter";
import { deriveWeightPointDayKey } from "@/lib/data/body/weightDayKey";
import { isAppleHealthBodyReadSourceId } from "@oli/contracts/bodyReadSources";
import {
  formatBodyLeanMass,
  formatBodyWeight,
} from "@/lib/ui/body/bodyMetricFormatting";
import { formatMetricLogDateFromDayKey } from "@/lib/ui/logs/formatMetricLogDate";

export type BodyCompositionLogEntry = {
  rawEventId: string;
  observedAt: string;
  dayKey: string;
  /** Present for weight-kind rows; null for composition-only lean/fat rows. */
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanBodyMassKg: number | null;
  provider: string;
  sourceId: string;
  isImported: boolean;
  canEdit: boolean;
  canDelete: boolean;
  deleteMenuLabel: string;
  editDisabledReason: string | null;
  deleteDisabledReason: string | null;
};

export type BodyCompositionLogRowVm = {
  entry: BodyCompositionLogEntry;
  dateLabel: string;
  primaryMetric: string;
  secondaryMetric: string | null;
  accessibilityLabel: string;
};

const IMPORTED_READONLY_HINT = "This entry is read-only in Oli.";

function bodyFatSecondaryLabel(bodyFatPercent: number | null): string | null {
  if (bodyFatPercent == null || !Number.isFinite(bodyFatPercent)) return null;
  return `Body fat ${bodyFatPercent.toFixed(1)}%`;
}

function inferWeightEntryProvider(sourceId: string): string {
  if (sourceId === "manual") return "manual";
  if (isAppleHealthBodyReadSourceId(sourceId)) return "apple_health";
  return "imported";
}

function eligibilityForProvider(provider: string): Pick<
  BodyCompositionLogEntry,
  "isImported" | "canEdit" | "canDelete" | "deleteMenuLabel" | "editDisabledReason" | "deleteDisabledReason"
> {
  if (provider === "manual") {
    return {
      isImported: false,
      canEdit: true,
      canDelete: true,
      deleteMenuLabel: "Delete",
      editDisabledReason: null,
      deleteDisabledReason: null,
    };
  }
  if (provider === "apple_health") {
    return {
      isImported: true,
      canEdit: true,
      canDelete: true,
      deleteMenuLabel: "Delete from Oli",
      editDisabledReason: null,
      deleteDisabledReason: null,
    };
  }
  return {
    isImported: true,
    canEdit: false,
    canDelete: false,
    deleteMenuLabel: "Delete from Oli",
    editDisabledReason: "This entry is read-only in Oli.",
    deleteDisabledReason: IMPORTED_READONLY_HINT,
  };
}

function parseCompositionFields(payload: unknown): {
  bodyFatPercent: number | null;
  leanBodyMassKg: number | null;
  weightKg: number | null;
} {
  if (payload == null || typeof payload !== "object") {
    return { bodyFatPercent: null, leanBodyMassKg: null, weightKg: null };
  }
  const p = payload as Record<string, unknown>;
  const bodyFatPercent =
    typeof p.bodyFatPercent === "number" && Number.isFinite(p.bodyFatPercent)
      ? p.bodyFatPercent
      : null;
  const leanBodyMassKg =
    typeof p.leanBodyMassKg === "number" && Number.isFinite(p.leanBodyMassKg) && p.leanBodyMassKg > 0
      ? p.leanBodyMassKg
      : null;
  const weightKg =
    typeof p.weightKg === "number" && Number.isFinite(p.weightKg) && p.weightKg > 0
      ? p.weightKg
      : null;
  return { bodyFatPercent, leanBodyMassKg, weightKg };
}

export function buildBodyCompositionLogEntries(
  items: readonly RawEventListItem[],
  timeZone: string,
): BodyCompositionLogEntry[] {
  const out: BodyCompositionLogEntry[] = [];

  for (const item of items) {
    if (item.kind !== "weight" && item.kind !== "body_composition") continue;
    const observedAt = item.observedAt;
    if (typeof observedAt !== "string" || observedAt.length === 0) continue;

    if (item.kind === "weight") {
      const parsed = manualWeightPayloadSchema.safeParse(item.payload);
      if (!parsed.success) continue;
      const payload = parsed.data;
      const weightKg = payload.weightKg;
      if (!(weightKg > 0)) continue;
      const dayKey = deriveWeightPointDayKey(payload, observedAt, timeZone);
      const provider = inferWeightEntryProvider(item.sourceId);
      const eligibility = eligibilityForProvider(provider);
      const bodyFatPercent =
        payload.bodyFatPercent != null && Number.isFinite(payload.bodyFatPercent)
          ? payload.bodyFatPercent
          : null;
      const leanFields = parseCompositionFields(payload);

      out.push({
        rawEventId: item.id,
        observedAt,
        dayKey,
        weightKg,
        bodyFatPercent,
        leanBodyMassKg: leanFields.leanBodyMassKg,
        provider,
        sourceId: item.sourceId,
        ...eligibility,
      });
      continue;
    }

    // body_composition — may carry lean / fat without weight
    const fields = parseCompositionFields(item.payload);
    if (fields.bodyFatPercent == null && fields.leanBodyMassKg == null) continue;
    const dayKey = deriveWeightPointDayKey(
      (item.payload as { time?: string; timezone?: string }) ?? {},
      observedAt,
      timeZone,
    );
    const provider = inferWeightEntryProvider(item.sourceId);
    const eligibility = eligibilityForProvider(provider);
    // Composition-only rows are not editable via the Weight log modal.
    out.push({
      rawEventId: item.id,
      observedAt,
      dayKey,
      weightKg: fields.weightKg,
      bodyFatPercent: fields.bodyFatPercent,
      leanBodyMassKg: fields.leanBodyMassKg,
      provider,
      sourceId: item.sourceId,
      ...eligibility,
      canEdit: false,
      editDisabledReason: "Edit this measurement from its source metric when supported.",
    });
  }

  out.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  return out;
}

/** Keep only entries that carry the requested metric; never fall back to another metric. */
export function filterBodyCompositionLogEntriesForMetric(
  entries: readonly BodyCompositionLogEntry[],
  metric: BodyHistoryMetricFilter,
): BodyCompositionLogEntry[] {
  switch (metric) {
    case "weight":
      return entries.filter((e) => e.weightKg != null && e.weightKg > 0);
    case "bodyFat":
      return entries.filter((e) => e.bodyFatPercent != null && Number.isFinite(e.bodyFatPercent));
    case "leanTissue":
      return entries.filter((e) => e.leanBodyMassKg != null && e.leanBodyMassKg > 0);
    default:
      return [];
  }
}

export function buildBodyCompositionLogRowVm(
  entry: BodyCompositionLogEntry,
  unit: "kg" | "lb",
  metric: BodyHistoryMetricFilter = "weight",
): BodyCompositionLogRowVm {
  const dateLabel = formatMetricLogDateFromDayKey(entry.dayKey);

  if (metric === "bodyFat") {
    const primaryMetric =
      entry.bodyFatPercent != null
        ? `Body Fat ${entry.bodyFatPercent.toFixed(1)}%`
        : "Body Fat —";
    return {
      entry,
      dateLabel,
      primaryMetric,
      secondaryMetric: null,
      accessibilityLabel: `${dateLabel}. ${primaryMetric}.`,
    };
  }

  if (metric === "leanTissue") {
    const primaryMetric =
      entry.leanBodyMassKg != null
        ? `Lean Mass ${formatBodyLeanMass(entry.leanBodyMassKg, unit)}`
        : "Lean Mass —";
    return {
      entry,
      dateLabel,
      primaryMetric,
      secondaryMetric: null,
      accessibilityLabel: `${dateLabel}. ${primaryMetric}.`,
    };
  }

  const primaryMetric =
    entry.weightKg != null ? `Weight ${formatBodyWeight(entry.weightKg, unit)}` : "Weight —";
  const secondaryMetric = bodyFatSecondaryLabel(entry.bodyFatPercent);
  const secondaryPart = secondaryMetric ? ` ${secondaryMetric}` : "";
  return {
    entry,
    dateLabel,
    primaryMetric,
    secondaryMetric,
    accessibilityLabel: `${dateLabel}. ${primaryMetric}.${secondaryPart}`,
  };
}
