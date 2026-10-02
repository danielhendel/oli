// lib/data/body-scans/useBodyScanCategorySummaries.ts
/**
 * Landing/hub: one category-scoped limit=1 query per category.
 * Proves emptiness and latest without loading full history.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getBodyScans } from "@/lib/api/bodyScans";
import type { BodyScanType } from "@/lib/contracts";
import { BODY_SCAN_CATEGORY_TYPES } from "@/lib/data/body-scans/bodyScanCategoryCatalog";
import {
  buildCategorySummaryRow,
  type BodyScanCategorySummaryRow,
  type BodyScanCategorySummaryState,
} from "@/lib/data/body-scans/bodyScanCategorySummary";
import { subscribeDocumentDeleted } from "@/lib/data/documents/documentListInvalidate";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

export type UseBodyScanCategorySummariesOptions = {
  enabled?: boolean;
} & GetOptions;

type SummariesMap = Record<BodyScanType, BodyScanCategorySummaryState>;

function initialMap(status: "partial"): SummariesMap {
  const out = {} as SummariesMap;
  for (const type of BODY_SCAN_CATEGORY_TYPES) {
    out[type] = { status };
  }
  return out;
}

export function useBodyScanCategorySummaries(opts?: UseBodyScanCategorySummariesOptions): {
  rows: readonly BodyScanCategorySummaryRow[];
  status: "partial" | "error" | "ready";
  refetch: (opts?: GetOptions) => void;
} {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = opts?.enabled ?? true;
  const reqSeq = useRef(0);
  const [map, setMap] = useState<SummariesMap>(() => initialMap("partial"));

  const fetchAll = useCallback(
    async (refetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;
      if (!enabled) {
        const empty = {} as SummariesMap;
        for (const type of BODY_SCAN_CATEGORY_TYPES) {
          empty[type] = { status: "ready", latest: null };
        }
        if (seq === reqSeq.current) setMap(empty);
        return;
      }
      if (initializing || !user) {
        if (seq === reqSeq.current) setMap(initialMap("partial"));
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        const err = {} as SummariesMap;
        for (const type of BODY_SCAN_CATEGORY_TYPES) {
          err[type] = { status: "error", error: "No auth token" };
        }
        setMap(err);
        return;
      }

      setMap(initialMap("partial"));

      const results = await Promise.all(
        BODY_SCAN_CATEGORY_TYPES.map(async (scanType) => {
          const res = await getBodyScans(token, {
            scanType,
            limit: 1,
            ...refetchOpts,
            cacheBust: refetchOpts?.cacheBust
              ? `${refetchOpts.cacheBust}:${scanType}`
              : `summary:${scanType}:${Date.now()}`,
          });
          return { scanType, res };
        }),
      );
      if (seq !== reqSeq.current) return;

      const next = {} as SummariesMap;
      for (const { scanType, res } of results) {
        const outcome = truthOutcomeFromApiResult(res);
        if (outcome.status === "ready") {
          next[scanType] = {
            status: "ready",
            latest: outcome.data.items[0] ?? null,
          };
        } else if (outcome.status === "missing") {
          next[scanType] = { status: "ready", latest: null };
        } else {
          next[scanType] = { status: "error", error: outcome.error };
        }
      }
      setMap(next);
    },
    [enabled, getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, user?.uid, enabled]);

  useEffect(() => {
    return subscribeDocumentDeleted(({ documentId }) => {
      void fetchAll({ cacheBust: `deleted-${documentId}-${Date.now()}` });
    });
  }, [fetchAll]);

  const rows = useMemo(
    () => BODY_SCAN_CATEGORY_TYPES.map((type) => buildCategorySummaryRow(type, map[type])),
    [map],
  );

  const status = useMemo((): "partial" | "error" | "ready" => {
    const states = BODY_SCAN_CATEGORY_TYPES.map((t) => map[t].status);
    if (states.some((s) => s === "partial")) return "partial";
    if (states.every((s) => s === "error")) return "error";
    if (states.every((s) => s === "ready")) return "ready";
    // Mixed ready/error: treat as ready so nonempty rows still render; errors show per-row.
    return "ready";
  }, [map]);

  return { rows, status, refetch: fetchAll };
}
