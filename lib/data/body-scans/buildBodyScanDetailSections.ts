/**
 * Designed Body Scan detail view model (pure).
 *
 * Renders exactly what the report supports: no interpretation, no banding, no score,
 * and no invented values. Metrics absent from the report are simply absent.
 */

import type {
  BodyScanDetailDto,
  BodyScanMetricDto,
  BodyScanRegion,
  BodyScanSectionId,
} from "@oli/contracts";
import {
  BODY_SCAN_SECTION_NOTES,
  BODY_SCAN_SECTION_TITLES,
  bodyScanLateralPairs,
  bodyScanMetricDisplayLabel,
  bodyScanRegionLabel,
  bodyScanSectionForMetric,
  bodyScanUnitSuffix,
} from "./bodyScanMetricCatalog";

export type BodyScanDetailRow = {
  key: string;
  label: string;
  /** Preformatted display value, or null when the report did not supply it. */
  valueText: string | null;
  corrected: boolean;
};

export type BodyScanDetailSection = {
  id: BodyScanSectionId;
  title: string;
  note: string | null;
  rows: readonly BodyScanDetailRow[];
};

const SECTION_ORDER: readonly BodyScanSectionId[] = [
  "overview",
  "fat_distribution",
  "regional_composition",
  "regional_lean_balance",
  "total_body_bone",
  "source",
];

function formatMetricValue(metric: BodyScanMetricDto): string {
  const decimals = metric.unit === "g_per_cm2" ? 3 : metric.unit === "ratio" ? 2 : 1;
  return `${metric.value.toFixed(decimals)}${bodyScanUnitSuffix(metric.unit)}`;
}

function metricKey(metric: BodyScanMetricDto): string {
  return `${metric.metricId}:${metric.region}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Calendar date as printed on the report — no timezone shifting, no time of day. */
function formatScanDate(iso: string | null): string | null {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

function buildLeanBalanceRows(metrics: readonly BodyScanMetricDto[]): BodyScanDetailRow[] {
  const byRegion = new Map<BodyScanRegion, BodyScanMetricDto>();
  for (const metric of metrics) {
    if (metric.metricId !== "lean_mass") continue;
    byRegion.set(metric.region, metric);
  }

  const rows: BodyScanDetailRow[] = [];
  for (const [left, right] of bodyScanLateralPairs()) {
    const leftMetric = byRegion.get(left);
    const rightMetric = byRegion.get(right);
    if (leftMetric) {
      rows.push({
        key: metricKey(leftMetric),
        label: bodyScanMetricDisplayLabel({ metricId: "lean_mass", region: left }),
        valueText: formatMetricValue(leftMetric),
        corrected: leftMetric.corrected,
      });
    }
    if (rightMetric) {
      rows.push({
        key: metricKey(rightMetric),
        label: bodyScanMetricDisplayLabel({ metricId: "lean_mass", region: right }),
        valueText: formatMetricValue(rightMetric),
        corrected: rightMetric.corrected,
      });
    }
    // Difference is arithmetic on the report's own numbers, not a derived health claim.
    if (leftMetric && rightMetric && leftMetric.unit === rightMetric.unit) {
      const delta = rightMetric.value - leftMetric.value;
      const label = `${bodyScanRegionLabel(right)} − ${bodyScanRegionLabel(left)} Difference`;
      rows.push({
        key: `lean_balance_delta:${left}:${right}`,
        label,
        valueText: `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}${bodyScanUnitSuffix(leftMetric.unit)}`,
        corrected: leftMetric.corrected || rightMetric.corrected,
      });
    }
  }
  return rows;
}

function buildSourceRows(scan: BodyScanDetailDto): BodyScanDetailRow[] {
  const rows: BodyScanDetailRow[] = [
    { key: "source_filename", label: "Report", valueText: scan.sourceFilename, corrected: false },
    {
      key: "source_device",
      label: "Device",
      valueText: scan.deviceLabel,
      corrected: false,
    },
    {
      key: "source_adapter",
      label: "Extraction",
      valueText: scan.adapterLabel,
      corrected: false,
    },
    {
      key: "source_performed_at",
      label: "Scan date",
      valueText: formatScanDate(scan.performedAt),
      corrected: false,
    },
  ];
  return rows;
}

export function buildBodyScanDetailSections(scan: BodyScanDetailDto): BodyScanDetailSection[] {
  const grouped = new Map<BodyScanSectionId, BodyScanDetailRow[]>();

  for (const metric of scan.metrics) {
    const sectionId = bodyScanSectionForMetric({
      metricId: metric.metricId,
      region: metric.region,
    });
    if (sectionId === "regional_lean_balance") continue;
    const rows = grouped.get(sectionId) ?? [];
    rows.push({
      key: metricKey(metric),
      label: bodyScanMetricDisplayLabel({ metricId: metric.metricId, region: metric.region }),
      valueText: formatMetricValue(metric),
      corrected: metric.corrected,
    });
    grouped.set(sectionId, rows);
  }

  const leanBalanceRows = buildLeanBalanceRows(scan.metrics);
  if (leanBalanceRows.length > 0) grouped.set("regional_lean_balance", leanBalanceRows);
  grouped.set("source", buildSourceRows(scan));

  const sections: BodyScanDetailSection[] = [];
  for (const id of SECTION_ORDER) {
    const rows = grouped.get(id);
    if (!rows || rows.length === 0) continue;
    sections.push({
      id,
      title: BODY_SCAN_SECTION_TITLES[id],
      note: BODY_SCAN_SECTION_NOTES[id] ?? null,
      rows,
    });
  }
  return sections;
}
