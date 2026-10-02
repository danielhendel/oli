/**
 * Unified Body Scan category/list invalidation bus.
 *
 * Mounted summaries and histories subscribe here so upload/confirm/reprocess/
 * delete/type-change refresh category truth without remounting.
 *
 * Payload is intentionally non-identifying: reason + category tokens only.
 * Never put scan/document IDs, UID, filenames, values, cursors, or paths here.
 */
import type { BodyScanType } from "@oli/contracts";

import { BODY_SCAN_CATEGORY_TYPES } from "@/lib/data/body-scans/bodyScanCategoryCatalog";

export type BodyScanListInvalidationReason =
  | "upload_success"
  | "confirm_success"
  | "reprocess_success"
  | "delete_success"
  | "scan_type_changed"
  | "manual_refresh";

export type BodyScanListInvalidation = {
  readonly reason: BodyScanListInvalidationReason;
  /** Specific categories, or all five when category may change / is unknown. */
  readonly categories: readonly BodyScanType[] | "all";
};

type Listener = (event: BodyScanListInvalidation) => void;

const listeners = new Set<Listener>();

let pending: BodyScanListInvalidation | null = null;
let flushScheduled = false;
/** Monotonic epoch so subscribers can ignore stale in-flight merges. */
let epoch = 0;

function uniqCategories(categories: readonly BodyScanType[]): BodyScanType[] {
  const out: BodyScanType[] = [];
  const seen = new Set<BodyScanType>();
  for (const c of categories) {
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

function mergeInvalidations(
  a: BodyScanListInvalidation | null,
  b: BodyScanListInvalidation,
): BodyScanListInvalidation {
  if (!a) return b;
  if (a.categories === "all" || b.categories === "all") {
    return { reason: b.reason, categories: "all" };
  }
  return {
    reason: b.reason,
    categories: uniqCategories([...a.categories, ...b.categories]),
  };
}

function flush(): void {
  flushScheduled = false;
  const event = pending;
  pending = null;
  if (!event) return;
  epoch += 1;
  for (const listener of listeners) {
    listener(event);
  }
}

/**
 * Publish a category/list invalidation. Same-tick publishes coalesce.
 * Does not log payloads.
 */
export function invalidateBodyScanList(event: BodyScanListInvalidation): void {
  pending = mergeInvalidations(pending, event);
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(flush);
}

export function subscribeBodyScanListInvalidation(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** True when this mounted query should refetch for the event. */
export function bodyScanListInvalidationAffects(
  event: BodyScanListInvalidation,
  scanType: BodyScanType | "all",
): boolean {
  if (event.categories === "all" || scanType === "all") return true;
  return event.categories.includes(scanType);
}

export function bodyScanListInvalidationEpoch(): number {
  return epoch;
}

/** Resolve concrete category list for scoped refetches. */
export function resolveBodyScanInvalidationCategories(
  event: BodyScanListInvalidation,
): readonly BodyScanType[] {
  if (event.categories === "all") return BODY_SCAN_CATEGORY_TYPES;
  return event.categories;
}

/** Test-only reset. */
export function __testing_resetBodyScanListInvalidate(): void {
  listeners.clear();
  pending = null;
  flushScheduled = false;
  epoch = 0;
}
