/**
 * Completeness-safe Body Scan category summary presentation.
 *
 * "No scans yet" is allowed only when a category-scoped query proves empty.
 * Loading / error / incomplete coverage must never become an empty claim.
 * Exact counts are omitted in V1.
 */
import type { BodyScanListItemDto, BodyScanType } from "@oli/contracts";

import {
  bodyScanCategoryDefinition,
  type BodyScanCategoryDefinition,
} from "./bodyScanCategoryCatalog";
import { bodyScanNavStatusLabel } from "./bodyScanNavStatusLabel";
import { formatLabSourceCalendarDate } from "@/lib/labs/labSourceDisplay";

function formatScanNavDate(iso: string): string {
  return formatLabSourceCalendarDate(iso) ?? "—";
}

function formatLatestDate(item: BodyScanListItemDto): string {
  if (item.performedAt) return formatScanNavDate(item.performedAt);
  return formatScanNavDate(item.uploadedAt);
}

export type BodyScanCategorySummaryState =
  | { status: "partial" }
  | { status: "error"; error: string }
  | { status: "ready"; latest: BodyScanListItemDto | null };

export type BodyScanCategorySummaryRow = {
  readonly category: BodyScanCategoryDefinition;
  readonly rowStatus: "partial" | "error" | "ready";
  readonly hasScans: boolean;
  readonly latest: BodyScanListItemDto | null;
  readonly supportingCopy: string;
  readonly accessibilityLabel: string;
};

export function buildCategorySummarySupportingCopy(
  state: BodyScanCategorySummaryState,
): string {
  if (state.status === "partial") return "Loading…";
  if (state.status === "error") return "Unable to load";
  if (!state.latest) return "No scans yet";
  const date = formatLatestDate(state.latest);
  const status = bodyScanNavStatusLabel(state.latest.status);
  return `Latest ${date} · ${status}`;
}

export function buildCategorySummaryAccessibilityLabel(
  category: BodyScanCategoryDefinition,
  state: BodyScanCategorySummaryState,
): string {
  if (state.status === "partial") return `${category.label}. Loading.`;
  if (state.status === "error") return `${category.label}. Unable to load.`;
  if (!state.latest) return `${category.label}. No scans yet.`;
  const date = formatLatestDate(state.latest);
  const status = bodyScanNavStatusLabel(state.latest.status);
  return `${category.label}. Latest ${date}. ${status}.`;
}

export function buildCategorySummaryRow(
  scanType: BodyScanType,
  state: BodyScanCategorySummaryState,
): BodyScanCategorySummaryRow {
  const category = bodyScanCategoryDefinition(scanType);
  const latest = state.status === "ready" ? state.latest : null;
  return {
    category,
    rowStatus: state.status,
    hasScans: latest != null,
    latest,
    supportingCopy: buildCategorySummarySupportingCopy(state),
    accessibilityLabel: buildCategorySummaryAccessibilityLabel(category, state),
  };
}

/**
 * True only when a category-scoped first page proves emptiness.
 * Never use a truncated mixed global page for this decision.
 */
export function mayClaimCategoryEmpty(args: {
  items: readonly unknown[];
  hasMore: boolean;
  nextCursor: string | null;
}): boolean {
  return args.items.length === 0 && args.hasMore === false && args.nextCursor == null;
}
