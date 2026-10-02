/**
 * Pure Body Scan category grouping for landing / hub navigation.
 *
 * Deterministic, input-order independent, one scan per category membership,
 * unknown types → Other. Never emits values, filenames, or PHI.
 */
import type { BodyScanListItemDto, BodyScanType } from "@oli/contracts";

import {
  BODY_SCAN_CATEGORY_DEFINITIONS,
  bodyScanCategoryDefinition,
  type BodyScanCategoryDefinition,
} from "./bodyScanCategoryCatalog";
import { bodyScanNavStatusLabel } from "./bodyScanNavStatusLabel";
import { normalizeBodyScanType } from "./normalizeBodyScanType";
import { formatLabSourceCalendarDate } from "@/lib/labs/labSourceDisplay";

function formatScanNavDate(iso: string): string {
  return formatLabSourceCalendarDate(iso) ?? "—";
}

/** Server list hard max — counts/history completeness require items.length < this. */
export const BODY_SCAN_LIST_PAGE_MAX = 50;

export type BodyScanCategoryGroup = {
  readonly category: BodyScanCategoryDefinition;
  readonly hasScans: boolean;
  /** Present only when the input list is proven complete. */
  readonly scanCount: number | null;
  readonly latest: BodyScanListItemDto | null;
  /** Secondary row copy — never includes values / filenames / IDs. */
  readonly supportingCopy: string;
  readonly accessibilityLabel: string;
};

export type GroupBodyScansByCategoryResult = {
  readonly groups: readonly BodyScanCategoryGroup[];
  readonly listComplete: boolean;
};

function scanSortKey(item: BodyScanListItemDto): string {
  // Prefer performedAt; fall back to uploadedAt. Tie-break on id for stability.
  const primary = item.performedAt ?? item.uploadedAt;
  return `${primary}\0${item.id}`;
}

function compareNewestFirst(a: BodyScanListItemDto, b: BodyScanListItemDto): number {
  const ka = scanSortKey(a);
  const kb = scanSortKey(b);
  if (ka === kb) return 0;
  return ka < kb ? 1 : -1;
}

function formatLatestDate(item: BodyScanListItemDto): string {
  if (item.performedAt) return formatScanNavDate(item.performedAt);
  return formatScanNavDate(item.uploadedAt);
}

/**
 * Build supporting copy for a category row.
 * Pattern when history exists: `Latest {date} · {status}` (count omitted unless complete).
 * When complete and count known: `{n} scan(s) · Latest {date}`.
 */
export function buildBodyScanCategorySupportingCopy(args: {
  latest: BodyScanListItemDto | null;
  scanCount: number | null;
  listComplete: boolean;
}): string {
  if (!args.latest) return "No scans yet";
  const date = formatLatestDate(args.latest);
  const status = bodyScanNavStatusLabel(args.latest.status);
  if (args.listComplete && args.scanCount != null && args.scanCount > 0) {
    const noun = args.scanCount === 1 ? "scan" : "scans";
    return `${args.scanCount} ${noun} · Latest ${date}`;
  }
  return `Latest ${date} · ${status}`;
}

function buildAccessibilityLabel(args: {
  category: BodyScanCategoryDefinition;
  latest: BodyScanListItemDto | null;
  scanCount: number | null;
  listComplete: boolean;
}): string {
  if (!args.latest) return `${args.category.label}. No scans yet.`;
  const date = formatLatestDate(args.latest);
  const status = bodyScanNavStatusLabel(args.latest.status);
  if (args.listComplete && args.scanCount != null) {
    const noun = args.scanCount === 1 ? "scan" : "scans";
    const countWord =
      args.scanCount === 1 ? "One" : String(args.scanCount);
    return `${args.category.label}. ${countWord} ${noun}. Latest ${date}. ${status}.`;
  }
  return `${args.category.label}. Latest ${date}. ${status}.`;
}

export function groupBodyScansByCategory(
  items: readonly BodyScanListItemDto[],
  opts?: { listComplete?: boolean },
): GroupBodyScansByCategoryResult {
  const listComplete = opts?.listComplete ?? items.length < BODY_SCAN_LIST_PAGE_MAX;

  const buckets = new Map<BodyScanType, BodyScanListItemDto[]>();
  for (const def of BODY_SCAN_CATEGORY_DEFINITIONS) {
    buckets.set(def.type, []);
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const type = normalizeBodyScanType(item.scanType);
    const bucket = buckets.get(type) ?? buckets.get("other")!;
    bucket.push(item);
  }

  const groups: BodyScanCategoryGroup[] = BODY_SCAN_CATEGORY_DEFINITIONS.map((def) => {
    const bucket = buckets.get(def.type) ?? [];
    const sorted = [...bucket].sort(compareNewestFirst);
    const latest = sorted[0] ?? null;
    const scanCount = listComplete ? sorted.length : null;
    const category = bodyScanCategoryDefinition(def.type);
    return {
      category,
      hasScans: latest != null,
      scanCount,
      latest,
      supportingCopy: buildBodyScanCategorySupportingCopy({
        latest,
        scanCount,
        listComplete,
      }),
      accessibilityLabel: buildAccessibilityLabel({
        category,
        latest,
        scanCount,
        listComplete,
      }),
    };
  });

  return { groups, listComplete };
}

/**
 * Filter + sort scans for a category history page (newest first).
 */
export function selectBodyScansForCategory(
  items: readonly BodyScanListItemDto[],
  scanType: BodyScanType,
): BodyScanListItemDto[] {
  const target = normalizeBodyScanType(scanType);
  const filtered = items.filter((item) => normalizeBodyScanType(item.scanType) === target);
  return [...filtered].sort(compareNewestFirst);
}

/**
 * History row primary date label — prefers performedAt; honest upload fallback.
 */
export function bodyScanHistoryDateLabel(item: BodyScanListItemDto): string {
  if (item.performedAt) return formatScanNavDate(item.performedAt);
  return `Uploaded ${formatScanNavDate(item.uploadedAt)}`;
}

export function bodyScanHistoryAccessibilityLabel(item: BodyScanListItemDto): string {
  const date = bodyScanHistoryDateLabel(item);
  const status = bodyScanNavStatusLabel(item.status);
  const device = item.deviceLabel ? `${item.deviceLabel}. ` : "";
  return `${date}. ${device}${status}.`;
}
