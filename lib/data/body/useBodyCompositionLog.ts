import { useCallback, useMemo } from "react";

import type { BodyHistoryMetricFilter } from "@/lib/data/body/bodyHistoryMetricFilter";
import { resolveBodyHistoryQueryWindow } from "@/lib/data/body/bodyHistoryRange";
import {
  buildBodyCompositionLogEntries,
  filterBodyCompositionLogEntriesForMetric,
  type BodyCompositionLogEntry,
} from "@/lib/data/body/bodyCompositionLogEntries";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";
import { useRawEvents } from "@/lib/data/useRawEvents";

export function useBodyCompositionLog(metric: BodyHistoryMetricFilter = "weight"): {
  status: "partial" | "error" | "ready";
  entries: BodyCompositionLogEntry[];
  error: string | null;
  requestId: string | null;
  refetch: () => void;
} {
  const tz = getDeviceTimeZone();
  const { start, end } = useMemo(() => resolveBodyHistoryQueryWindow("5Y"), []);
  const kinds =
    metric === "weight" ? (["weight"] as const) : (["weight", "body_composition"] as const);
  const raw = useRawEvents(
    {
      start,
      end,
      kinds: [...kinds],
      includePayload: true,
      limit: 100,
    },
    { enabled: true },
  );

  const refetch = useCallback(() => {
    void raw.refetch();
  }, [raw]);

  const entries = useMemo(() => {
    if (raw.status !== "ready") return [];
    const all = buildBodyCompositionLogEntries(raw.data.items, tz);
    return filterBodyCompositionLogEntriesForMetric(all, metric);
  }, [raw, tz, metric]);

  if (raw.status === "error") {
    return {
      status: "error",
      entries: [],
      error: raw.error,
      requestId: raw.requestId,
      refetch,
    };
  }

  if (raw.status === "partial") {
    return { status: "partial", entries: [], error: null, requestId: null, refetch };
  }

  return { status: "ready", entries, error: null, requestId: null, refetch };
}
