/**
 * Designed Body Scan detail view model (pure).
 *
 * Renders exactly what the report supports: no interpretation, no banding, no score,
 * and no invented values. Metrics absent from the report are simply absent.
 *
 * Grouping, labels, and order come from the shared presentation selector
 * (`buildBodyScanPresentationGroups`), which is driven by the canonical registry.
 */

import type { BodyScanDetailDto, BodyScanSectionId } from "@oli/contracts";

import {
  buildBodyScanPresentationGroupsFromDetail,
  bodyScanMetricAccessibilityLabel,
  type BodyScanPresentationGroup,
  type BodyScanPresentationItem,
  type BodyScanPresentationRegionBlock,
} from "./buildBodyScanPresentationGroups";

export type BodyScanDetailRow = {
  key: string;
  label: string;
  /** Preformatted display value, or null when the report did not supply it. */
  valueText: string | null;
  corrected: boolean;
  accessibilityLabel: string;
};

export type BodyScanDetailRegionBlock = {
  region: string;
  title: string;
  rows: readonly BodyScanDetailRow[];
};

export type BodyScanDetailSection = {
  id: BodyScanSectionId;
  title: string;
  note: string | null;
  rows: readonly BodyScanDetailRow[];
  regionBlocks: readonly BodyScanDetailRegionBlock[];
};

function toRow(item: BodyScanPresentationItem): BodyScanDetailRow {
  return {
    key: item.key,
    label: item.label,
    valueText: item.valueText,
    corrected: item.corrected,
    accessibilityLabel: bodyScanMetricAccessibilityLabel({
      label: item.label,
      valueText: item.valueText,
      unit: item.unit,
    }),
  };
}

function toRegionBlock(block: BodyScanPresentationRegionBlock): BodyScanDetailRegionBlock {
  return {
    region: block.region,
    title: block.title,
    rows: block.items.map(toRow),
  };
}

function toSection(group: BodyScanPresentationGroup): BodyScanDetailSection {
  return {
    id: group.sectionId,
    title: group.title,
    note: group.note,
    rows: group.items.map(toRow),
    regionBlocks: group.regionBlocks.map(toRegionBlock),
  };
}

export function buildBodyScanDetailSections(scan: BodyScanDetailDto): BodyScanDetailSection[] {
  return buildBodyScanPresentationGroupsFromDetail(scan).map(toSection);
}
