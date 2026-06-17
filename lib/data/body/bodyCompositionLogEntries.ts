import type { RawEventListItem } from "@oli/contracts";
import { manualWeightPayloadSchema } from "@oli/contracts";

import { deriveWeightPointDayKey } from "@/lib/data/body/weightDayKey";
import { isAppleHealthBodyReadSourceId } from "@oli/contracts/bodyReadSources";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";
import { formatMetricLogDateFromDayKey } from "@/lib/ui/logs/formatMetricLogDate";

export type BodyCompositionLogEntry = {
  rawEventId: string;
  observedAt: string;
  dayKey: string;
  weightKg: number;
  bodyFatPercent: number | null;
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

export function buildBodyCompositionLogEntries(
  items: readonly RawEventListItem[],
  timeZone: string,
): BodyCompositionLogEntry[] {
  const out: BodyCompositionLogEntry[] = [];

  for (const item of items) {
    if (item.kind !== "weight") continue;
    const parsed = manualWeightPayloadSchema.safeParse(item.payload);
    if (!parsed.success) continue;
    const payload = parsed.data;
    const weightKg = payload.weightKg;
    if (!(weightKg > 0)) continue;
    const observedAt = item.observedAt;
    if (typeof observedAt !== "string" || observedAt.length === 0) continue;
    const dayKey = deriveWeightPointDayKey(payload, observedAt, timeZone);
    const provider = inferWeightEntryProvider(item.sourceId);
    const eligibility = eligibilityForProvider(provider);
    const bodyFatPercent =
      payload.bodyFatPercent != null && Number.isFinite(payload.bodyFatPercent)
        ? payload.bodyFatPercent
        : null;

    out.push({
      rawEventId: item.id,
      observedAt,
      dayKey,
      weightKg,
      bodyFatPercent,
      provider,
      sourceId: item.sourceId,
      ...eligibility,
    });
  }

  out.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  return out;
}

export function buildBodyCompositionLogRowVm(
  entry: BodyCompositionLogEntry,
  unit: "kg" | "lb",
): BodyCompositionLogRowVm {
  const dateLabel = formatMetricLogDateFromDayKey(entry.dayKey);
  const primaryMetric = `Weight ${formatBodyWeight(entry.weightKg, unit)}`;
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
