import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRawEvents } from "@/lib/api/usersMe";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { filterToAppleHealthBodyReadSources } from "@/lib/data/body/sourceFiltering";
import { addDaysToDayKey } from "@/lib/data/body/bodyHistoryRange";
import { BODY_SNAPSHOT_DAY_PEEK_PER_KIND_LIMIT } from "@/lib/data/body/overviewPeekConstants";
import type { BodyOverviewPeekRow } from "@/lib/data/body/useBodyOverviewPeek";
import type { RawEventListItem } from "@oli/contracts";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "ready"; items: BodyOverviewPeekRow[] };

/**
 * Narrow-window raw-events fetch for the Body Overview snapshot calendar day so same-day
 * `body_composition` rows are not dropped when they fall outside the global newest-first peek page.
 */
export function useBodyOverviewSnapshotDayPeek(
  snapshotDay: string | null,
): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const reqSeq = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });

  const loadOnce = useCallback(
    async (opts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (!snapshotDay) {
        safeSet({ status: "ready", items: [] });
        return;
      }

      if (initializing || !user) {
        safeSet({ status: "partial" });
        return;
      }
      const token = await getIdToken(false);
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null, reason: "unknown" });
        return;
      }
      safeSet({ status: "partial" });

      const start = snapshotDay;
      const end = addDaysToDayKey(snapshotDay, 1);
      const base = {
        start,
        end,
        limit: BODY_SNAPSHOT_DAY_PEEK_PER_KIND_LIMIT,
        includePayload: true as const,
        ...opts,
      };

      const [weightRes, compositionRes] = await Promise.all([
        getRawEvents(token, { ...base, kinds: ["weight"] }),
        getRawEvents(token, { ...base, kinds: ["body_composition"] }),
      ]);
      if (seq !== reqSeq.current) return;

      const toRows = (items: RawEventListItem[]): BodyOverviewPeekRow[] => {
        const out: BodyOverviewPeekRow[] = [];
        for (const it of items) {
          const row: BodyOverviewPeekRow = {
            id: it.id,
            observedAt: it.observedAt,
            sourceId: it.sourceId,
            kind: it.kind,
          };
          if (it.payload !== undefined) row.payload = it.payload;
          out.push(row);
        }
        return out;
      };

      const wOutcome = truthOutcomeFromApiResult(weightRes);
      const cOutcome = truthOutcomeFromApiResult(compositionRes);

      const wItems =
        wOutcome.status === "ready" ? toRows(wOutcome.data.items) : wOutcome.status === "missing" ? [] : null;
      const cItems =
        cOutcome.status === "ready" ? toRows(cOutcome.data.items) : cOutcome.status === "missing" ? [] : null;

      if (wItems === null && cItems === null) {
        const primary = wOutcome.status === "error" ? wOutcome : cOutcome;
        if (primary.status === "error") {
          safeSet({
            status: "error",
            error: primary.error,
            requestId: primary.requestId,
            reason: primary.reason,
          });
        } else {
          safeSet({ status: "ready", items: [] });
        }
        return;
      }

      const merged = [...(wItems ?? []), ...(cItems ?? [])];
      const byId = new Map<string, BodyOverviewPeekRow>();
      for (const row of merged) {
        if (!byId.has(row.id)) byId.set(row.id, row);
      }
      const items = Array.from(byId.values()).sort((a, b) => b.observedAt.localeCompare(a.observedAt));
      safeSet({ status: "ready", items: filterToAppleHealthBodyReadSources(items) });
    },
    [getIdToken, initializing, snapshotDay, user],
  );

  useEffect(() => {
    void loadOnce();
  }, [loadOnce, user?.uid, snapshotDay]);

  return useMemo(() => ({ ...state, refetch: loadOnce }), [state, loadOnce]);
}
