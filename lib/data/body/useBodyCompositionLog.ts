import { useCallback, useMemo } from "react";

import { useRawEvents } from "@/lib/data/useRawEvents";
import { resolveBodyHistoryQueryWindow } from "@/lib/data/body/bodyHistoryRange";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";
import {
  buildBodyCompositionLogEntries,
  type BodyCompositionLogEntry,
} from "@/lib/data/body/bodyCompositionLogEntries";

export function useBodyCompositionLog(): {
  status: "partial" | "error" | "ready";
  entries: BodyCompositionLogEntry[];
  error: string | null;
  requestId: string | null;
  refetch: () => void;
} {
  const tz = getDeviceTimeZone();
  const { start, end } = useMemo(() => resolveBodyHistoryQueryWindow("5Y"), []);
  const raw = useRawEvents(
    {
      start,
      end,
      kinds: ["weight"],
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
    return buildBodyCompositionLogEntries(raw.data.items, tz);
  }, [raw, tz]);

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
