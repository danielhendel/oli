/**
 * Shared Body Scan presentation selector (Phase D/E).
 *
 * Pure: no Firebase, navigation, parser, or side effects.
 * Transforms candidate or verified measurements into registry-driven groups.
 *
 * Registry owns: label, group, unit expectation, visibility/productStatus.
 * This module owns: group order, region order, region cards, source metadata rows.
 */

import type {
  BodyScanDetailDto,
  BodyScanMetricDto,
  BodyScanMetricGroupId,
  BodyScanMetricId,
  BodyScanMethod,
  BodyScanRegion,
  BodyScanReviewFieldDto,
  BodyScanSectionId,
  BodyScanUnit,
} from "@oli/contracts";

import {
  BODY_SCAN_BILATERAL_LEAN_ORDER,
  BODY_SCAN_METRIC_SORT_INDEX,
  BODY_SCAN_REGIONAL_COMPOSITION_ORDER,
  BODY_SCAN_SECTION_NOTES,
  BODY_SCAN_SECTION_TITLES,
  bodyScanLateralPairs,
  bodyScanMetricDisplayLabel,
  bodyScanMetricLabel,
  bodyScanMetricLabelInRegion,
  bodyScanRegionLabel,
  bodyScanUnitSuffix,
} from "./bodyScanMetricCatalog";
import { formatBodyScanConsumerDisplayValue } from "./bodyScanDisplayFormat";
import { resolveBodyScanMetricRef } from "./bodyScanMetricAliases";
import {
  BODY_SCAN_GROUP_TO_SECTION,
  BODY_SCAN_METRIC_REGISTRY,
  bodyScanRegistryGroupForMetric,
} from "./bodyScanMetricRegistry";

/** Presentation group order (Review + Detail). Source is always last when present. */
export const BODY_SCAN_PRESENTATION_GROUP_ORDER: readonly Exclude<
  BodyScanMetricGroupId,
  "source"
>[] = ["overview", "fat_distribution", "regional_composition", "regional_lean", "bone"];

export type BodyScanPresentationSurface = "review" | "detail";

export type BodyScanPresentationItem = {
  key: string;
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
  /** Canonical product label (registry). */
  label: string;
  /** Registry educational copy when available. */
  description: string | null;
  unit: BodyScanUnit;
  /** Preformatted display value for Detail; null when missing. */
  valueText: string | null;
  corrected: boolean;
  /** Review field id when built from candidates. */
  fieldId: string | null;
};

export type BodyScanPresentationRegionBlock = {
  region: BodyScanRegion;
  title: string;
  items: readonly BodyScanPresentationItem[];
};

export type BodyScanPresentationGroup = {
  group: BodyScanMetricGroupId;
  sectionId: BodyScanSectionId;
  title: string;
  note: string | null;
  /** Flat items (overview, fat distribution, bone, source, regional lean when flat). */
  items: readonly BodyScanPresentationItem[];
  /** Region cards for regional composition (and optional regional lean). */
  regionBlocks: readonly BodyScanPresentationRegionBlock[];
};

export type BodyScanSourcePresentationInput = {
  method: BodyScanMethod;
  performedAt: string | null;
  deviceLabel: string | null;
  /** Consumer-safe report label (never a raw device filename). */
  reportLabel: string | null;
  statusLabel: string | null;
};

const METHOD_LABELS: Record<BodyScanMethod, string> = {
  dxa: "DXA",
  bia: "BIA",
  air_displacement: "Air displacement",
  other: "Other",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Calendar date as printed on the report — no timezone shifting. */
export function formatBodyScanPresentationDate(iso: string | null): string | null {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

/**
 * Central UI enablement: registry uiEnabled + productStatus gate.
 * Deferred (T/Z) and future (SMM) never surface in Review/Detail.
 */
export function isMetricVisibleInReview(metricId: BodyScanMetricId): boolean {
  return isMetricVisibleOnSurface(metricId, "review");
}

export function isMetricVisibleInDetail(metricId: BodyScanMetricId): boolean {
  return isMetricVisibleOnSurface(metricId, "detail");
}

export function isMetricVisibleOnSurface(
  metricId: BodyScanMetricId,
  surface: BodyScanPresentationSurface,
): boolean {
  void surface; // Same gate for Review and Detail in Stage 3E V1.
  const def = BODY_SCAN_METRIC_REGISTRY[metricId];
  if (!def) return false;
  if (!def.uiEnabled) return false;
  if (def.productStatus === "deferred" || def.productStatus === "future") return false;
  return true;
}

function metricSortKey(metricId: BodyScanMetricId, region: BodyScanRegion): number {
  const metricIndex = BODY_SCAN_METRIC_SORT_INDEX[metricId] ?? 900;
  const regionIndex =
    BODY_SCAN_REGIONAL_COMPOSITION_ORDER.indexOf(region) >= 0
      ? BODY_SCAN_REGIONAL_COMPOSITION_ORDER.indexOf(region)
      : BODY_SCAN_BILATERAL_LEAN_ORDER.indexOf(region) >= 0
        ? BODY_SCAN_BILATERAL_LEAN_ORDER.indexOf(region)
        : region === "total"
          ? -1
          : 50;
  return metricIndex * 100 + regionIndex;
}

function comparePresentationItems(a: BodyScanPresentationItem, b: BodyScanPresentationItem): number {
  const ka = metricSortKey(a.metricId, a.region);
  const kb = metricSortKey(b.metricId, b.region);
  if (ka !== kb) return ka - kb;
  if (a.region !== b.region) return a.region.localeCompare(b.region);
  return a.metricId.localeCompare(b.metricId);
}

function formatMetricValueText(value: number, unit: BodyScanUnit): string {
  return `${formatBodyScanConsumerDisplayValue(value, unit)}${bodyScanUnitSuffix(unit)}`;
}

function resolveCanonicalRef(args: {
  metricId?: string | null;
  region?: string | null;
  fieldId?: string | null;
}): { metricId: BodyScanMetricId; region: BodyScanRegion } | null {
  const resolved = resolveBodyScanMetricRef(args);
  if (!resolved) return null;
  if (!(resolved.metricId in BODY_SCAN_METRIC_REGISTRY)) return null;
  return resolved;
}

type NormalizedMeasurement = {
  key: string;
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
  unit: BodyScanUnit;
  value: number | null;
  corrected: boolean;
  fieldId: string | null;
};

function toPresentationItem(
  m: NormalizedMeasurement,
  opts: { useRegionCardLabel: boolean },
): BodyScanPresentationItem {
  const def = BODY_SCAN_METRIC_REGISTRY[m.metricId];
  const label = opts.useRegionCardLabel
    ? bodyScanMetricLabelInRegion(m.metricId)
    : bodyScanMetricDisplayLabel({ metricId: m.metricId, region: m.region });
  return {
    key: m.key,
    metricId: m.metricId,
    region: m.region,
    label,
    description: def?.description ?? null,
    unit: m.unit,
    valueText: m.value == null ? null : formatMetricValueText(m.value, m.unit),
    corrected: m.corrected,
    fieldId: m.fieldId,
  };
}

function buildLeanBalanceDeltaItems(
  byRegion: Map<BodyScanRegion, NormalizedMeasurement>,
): BodyScanPresentationItem[] {
  const items: BodyScanPresentationItem[] = [];
  for (const [right, left] of bodyScanLateralPairs()) {
    const rightMetric = byRegion.get(right);
    const leftMetric = byRegion.get(left);
    if (!rightMetric || !leftMetric) continue;
    if (rightMetric.value == null || leftMetric.value == null) continue;
    if (rightMetric.unit !== leftMetric.unit) continue;
    const delta = rightMetric.value - leftMetric.value;
    items.push({
      key: `lean_balance_delta:${right}:${left}`,
      metricId: "lean_mass",
      region: right,
      label: `${bodyScanRegionLabel(right)} − ${bodyScanRegionLabel(left)} Difference`,
      description: null,
      unit: rightMetric.unit,
      valueText: `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}${bodyScanUnitSuffix(rightMetric.unit)}`,
      corrected: rightMetric.corrected || leftMetric.corrected,
      fieldId: null,
    });
  }
  return items;
}

function buildSourceItems(source: BodyScanSourcePresentationInput): BodyScanPresentationItem[] {
  // Always emit the designed source rows. Missing optional values stay null so the
  // UI can say "Not in this report" — never invent zeros or raw filenames.
  const rows: { key: string; label: string; valueText: string | null }[] = [
    { key: "source_method", label: "Method", valueText: METHOD_LABELS[source.method] ?? source.method },
    {
      key: "source_performed_at",
      label: "Scan date",
      valueText: formatBodyScanPresentationDate(source.performedAt),
    },
    { key: "source_device", label: "Device", valueText: source.deviceLabel },
    { key: "source_verification", label: "Verification", valueText: source.statusLabel },
    {
      key: "source_report",
      label: "Report",
      valueText: source.reportLabel?.trim() ? source.reportLabel : null,
    },
  ];
  return rows.map((row) => ({
    key: row.key,
    // Source rows are metadata, not physiological metrics.
    metricId: "total_mass" as BodyScanMetricId,
    region: "total" as const,
    label: row.label,
    description: null,
    unit: "kg" as const,
    valueText: row.valueText,
    corrected: false,
    fieldId: null,
  }));
}

/**
 * Core grouping: registry group → ordered presentation groups.
 * Prefer omission of empty sections. No zero placeholders.
 */
export function buildBodyScanPresentationGroups(args: {
  measurements: readonly NormalizedMeasurement[];
  surface: BodyScanPresentationSurface;
  source?: BodyScanSourcePresentationInput | null;
  /** Detail-only: include L−R lean difference rows. */
  includeLeanBalanceDeltas?: boolean;
}): BodyScanPresentationGroup[] {
  const visible = args.measurements.filter((m) => isMetricVisibleOnSurface(m.metricId, args.surface));

  const byGroup = new Map<Exclude<BodyScanMetricGroupId, "source">, NormalizedMeasurement[]>();
  for (const m of visible) {
    const group = bodyScanRegistryGroupForMetric(m.metricId, m.region);
    const list = byGroup.get(group) ?? [];
    list.push(m);
    byGroup.set(group, list);
  }

  const groups: BodyScanPresentationGroup[] = [];

  for (const group of BODY_SCAN_PRESENTATION_GROUP_ORDER) {
    const measurements = byGroup.get(group) ?? [];
    if (measurements.length === 0) continue;

    const sectionId = BODY_SCAN_GROUP_TO_SECTION[group];
    const title = BODY_SCAN_SECTION_TITLES[sectionId];
    const note = BODY_SCAN_SECTION_NOTES[sectionId] ?? null;

    if (group === "regional_composition") {
      const regionBlocks: BodyScanPresentationRegionBlock[] = [];
      for (const region of BODY_SCAN_REGIONAL_COMPOSITION_ORDER) {
        const regionMs = measurements.filter((m) => m.region === region);
        if (regionMs.length === 0) continue;
        const items = regionMs
          .map((m) => toPresentationItem(m, { useRegionCardLabel: true }))
          .sort(comparePresentationItems);
        regionBlocks.push({
          region,
          title: bodyScanRegionLabel(region),
          items,
        });
      }
      if (regionBlocks.length === 0) continue;
      groups.push({
        group,
        sectionId,
        title,
        note,
        items: [],
        regionBlocks,
      });
      continue;
    }

    if (group === "regional_lean") {
      const byRegion = new Map<BodyScanRegion, NormalizedMeasurement>();
      for (const m of measurements) {
        if (m.metricId !== "lean_mass") continue;
        byRegion.set(m.region, m);
      }
      const regionBlocks: BodyScanPresentationRegionBlock[] = [];
      const flatItems: BodyScanPresentationItem[] = [];
      for (const region of BODY_SCAN_BILATERAL_LEAN_ORDER) {
        const m = byRegion.get(region);
        if (!m) continue;
        const item = toPresentationItem(m, { useRegionCardLabel: true });
        regionBlocks.push({
          region,
          title: bodyScanRegionLabel(region),
          items: [item],
        });
        flatItems.push(
          toPresentationItem(m, { useRegionCardLabel: false }),
        );
      }
      if (args.includeLeanBalanceDeltas) {
        flatItems.push(...buildLeanBalanceDeltaItems(byRegion));
      }
      if (flatItems.length === 0) continue;
      groups.push({
        group,
        sectionId,
        title,
        note,
        // Prefer region cards; keep flat items for a11y / delta rows.
        items: args.includeLeanBalanceDeltas
          ? [...flatItems.filter((i) => i.key.startsWith("lean_balance_delta:"))]
          : [],
        regionBlocks,
      });
      continue;
    }

    const items = measurements
      .map((m) => toPresentationItem(m, { useRegionCardLabel: false }))
      .sort(comparePresentationItems);
    groups.push({
      group,
      sectionId,
      title,
      note,
      items,
      regionBlocks: [],
    });
  }

  if (args.source) {
    const sourceItems = buildSourceItems(args.source);
    if (sourceItems.length > 0) {
      groups.push({
        group: "source",
        sectionId: "source",
        title: BODY_SCAN_SECTION_TITLES.source,
        note: null,
        items: sourceItems,
        regionBlocks: [],
      });
    }
  }

  return groups;
}

/** Detail: verified metrics only → presentation groups + source metadata. */
export function buildBodyScanPresentationGroupsFromDetail(
  scan: BodyScanDetailDto,
): BodyScanPresentationGroup[] {
  const measurements: NormalizedMeasurement[] = [];
  for (const metric of scan.metrics) {
    const resolved = resolveCanonicalRef({
      metricId: metric.metricId,
      region: metric.region,
    });
    if (!resolved) continue;
    measurements.push({
      key: `${resolved.metricId}:${resolved.region}`,
      metricId: resolved.metricId,
      region: resolved.region,
      unit: metric.unit,
      value: metric.value,
      corrected: metric.corrected,
      fieldId: null,
    });
  }

  return buildBodyScanPresentationGroups({
    measurements,
    surface: "detail",
    includeLeanBalanceDeltas: true,
    source: {
      method: scan.method,
      performedAt: scan.performedAt,
      deviceLabel: scan.deviceLabel,
      reportLabel: scan.sourceFilename,
      statusLabel: scan.statusLabel,
    },
  });
}

/** Review: candidate fields → presentation groups (no source metadata section). */
export function buildBodyScanPresentationGroupsFromReviewFields(
  fields: readonly BodyScanReviewFieldDto[],
): BodyScanPresentationGroup[] {
  const measurements: NormalizedMeasurement[] = [];
  for (const field of fields) {
    const resolved = resolveCanonicalRef({
      metricId: field.metricId,
      region: field.region,
      fieldId: field.fieldId,
    });
    if (!resolved) continue;
    measurements.push({
      key: field.fieldId,
      metricId: resolved.metricId,
      region: resolved.region,
      unit: field.unit,
      value: field.normalizedValue,
      corrected: false,
      fieldId: field.fieldId,
    });
  }

  return buildBodyScanPresentationGroups({
    measurements,
    surface: "review",
    includeLeanBalanceDeltas: false,
    source: null,
  });
}

/** Flatten group items + region-block items in stable display order (for Review field walk). */
export function flattenPresentationGroupItems(
  groups: readonly BodyScanPresentationGroup[],
): BodyScanPresentationItem[] {
  const out: BodyScanPresentationItem[] = [];
  for (const group of groups) {
    for (const block of group.regionBlocks) {
      out.push(...block.items);
    }
    out.push(...group.items);
  }
  return out;
}

/** Accessibility label for a metric row. */
export function bodyScanMetricAccessibilityLabel(args: {
  label: string;
  valueText: string | null;
  unit: BodyScanUnit;
}): string {
  if (args.valueText == null) return `${args.label}, not reported`;
  // Source metadata and non-numeric values: speak the display text as-is.
  if (!/^-?\d/.test(args.valueText.trim())) {
    return `${args.label}, ${args.valueText}`;
  }
  const spokenUnit =
    args.unit === "kg"
      ? "kilograms"
      : args.unit === "g"
        ? "grams"
        : args.unit === "percent"
          ? "percent"
          : args.unit === "g_per_cm2"
            ? "grams per square centimeter"
            : args.unit === "cm3"
              ? "cubic centimeters"
              : args.unit === "lb"
                ? "pounds"
                : "";
  const numeric = args.valueText.replace(/\s*(%|kg|g|lb|g\/cm²|cm³)\s*$/u, "").trim();
  return spokenUnit ? `${args.label}, ${numeric} ${spokenUnit}` : `${args.label}, ${args.valueText}`;
}

export function bodyScanCanonicalMetricLabel(metricId: BodyScanMetricId): string {
  return bodyScanMetricLabel(metricId);
}

/** Test helper: normalize Detail DTO metrics without relying on parser order. */
export function normalizeDetailMetricsForPresentation(
  metrics: readonly BodyScanMetricDto[],
): NormalizedMeasurement[] {
  return metrics.flatMap((metric) => {
    const resolved = resolveCanonicalRef({
      metricId: metric.metricId,
      region: metric.region,
    });
    if (!resolved) return [];
    return [
      {
        key: `${resolved.metricId}:${resolved.region}`,
        metricId: resolved.metricId,
        region: resolved.region,
        unit: metric.unit,
        value: metric.value,
        corrected: metric.corrected,
        fieldId: null,
      },
    ];
  });
}
