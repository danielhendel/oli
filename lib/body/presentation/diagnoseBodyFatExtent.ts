/**
 * DEV-only Body Fat extent diagnostics across stored / trend / rendered / list layers.
 * Never logs measurement values, UIDs, emails, tokens, or event/sample IDs.
 */

export type BodyFatExtentLayer =
  | "stored"
  | "trend"
  | "rendered"
  | "history_list";

export type BodyFatExtentDiagnostic = {
  readonly metric: "bodyFat";
  readonly layer: BodyFatExtentLayer;
  readonly oldestObservedAt: string | null;
  readonly newestObservedAt: string | null;
  readonly sampleCountBucket: string;
  readonly pagesLoaded?: number;
  readonly chunksScanned?: number;
  readonly requestedRange?: string;
  readonly operation?: string;
  readonly status: "ok" | "empty" | "error";
  readonly safeErrorCode: string | null;
};

const LAYER_TAG: Record<BodyFatExtentLayer, string> = {
  stored: "[BODY_FAT_STORED_EXTENT]",
  trend: "[BODY_FAT_TREND_EXTENT]",
  rendered: "[BODY_FAT_RENDERED_EXTENT]",
  history_list: "[BODY_FAT_HISTORY_LIST_EXTENT]",
};

export function approxSampleCountBucket(n: number): string {
  if (n <= 0) return "0";
  if (n < 10) return "1-9";
  if (n < 50) return "10-49";
  if (n < 100) return "50-99";
  if (n < 500) return "100-499";
  if (n < 2000) return "500-1999";
  return "2000+";
}

export function buildBodyFatExtentDiagnostic(args: {
  readonly layer: BodyFatExtentLayer;
  readonly observedAts: readonly string[];
  readonly pagesLoaded?: number;
  readonly chunksScanned?: number;
  readonly requestedRange?: string;
  readonly operation?: string;
  readonly status?: "ok" | "empty" | "error";
  readonly safeErrorCode?: string | null;
}): BodyFatExtentDiagnostic {
  const sorted = [...args.observedAts]
    .filter((t) => typeof t === "string" && t.length > 0)
    .sort((a, b) => a.localeCompare(b));
  const count = sorted.length;
  const status =
    args.status ?? (count > 0 ? "ok" : "empty");
  return {
    metric: "bodyFat",
    layer: args.layer,
    oldestObservedAt: sorted[0] ?? null,
    newestObservedAt: sorted[count - 1] ?? null,
    sampleCountBucket: approxSampleCountBucket(count),
    ...(args.pagesLoaded !== undefined ? { pagesLoaded: args.pagesLoaded } : {}),
    ...(args.chunksScanned !== undefined ? { chunksScanned: args.chunksScanned } : {}),
    ...(args.requestedRange !== undefined ? { requestedRange: args.requestedRange } : {}),
    ...(args.operation !== undefined ? { operation: args.operation } : {}),
    status,
    safeErrorCode: args.safeErrorCode ?? null,
  };
}

/** Emit a privacy-safe extent diagnostic in DEV only. */
export function emitBodyFatExtentDiagnostic(diag: BodyFatExtentDiagnostic): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.info(LAYER_TAG[diag.layer], diag);
  }
}

export function diagnoseBodyFatExtentFromObservedAts(
  layer: BodyFatExtentLayer,
  observedAts: readonly string[],
  extras?: {
    readonly pagesLoaded?: number;
    readonly requestedRange?: string;
    readonly operation?: string;
  },
): BodyFatExtentDiagnostic {
  const diag = buildBodyFatExtentDiagnostic({
    layer,
    observedAts,
    ...extras,
  });
  emitBodyFatExtentDiagnostic(diag);
  return diag;
}
