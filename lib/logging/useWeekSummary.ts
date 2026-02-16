// lib/logging/useWeekSummary.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import type { EventDoc, EventType, YMD } from "../types/domain";
import { listEvents } from "../db/events";
import { tsToDate } from "./readEvents";

/** Return YYYY-MM-DD for a local Date (no TZ surprises). */
function toYMDLocal(dt: Date): YMD {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  // The template literal guarantees the `${number}-${number}-${number}` shape at compile time.
  return `${y}-${m}-${d}` as YMD;
}

/** Local week range [since, until) aligned to Sunday..Saturday, plus the 7 YMD labels. */
function weekRangeLocal(anchor: Date): { since: Date; until: Date; days: YMD[] } {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  // move to previous Sunday
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const days: YMD[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(toYMDLocal(d));
  }

  return { since: start, until: end, days };
}

/**
 * Summarize a week for the hub calendar:
 * - which of the 7 days have logs (hasLogs[YYYY-MM-DD] === true)
 * - the day labels
 * - loading/error state
 * - a `reload()` you can call on focus
 */
export function useWeekSummary(type: EventType, uid?: string | null, anchor = new Date()) {
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);
  const [hasLogs, setHasLogs] = useState<Record<YMD, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Memoize the week frame and labels for the given anchor day.
  const { since, until, days } = useMemo(() => weekRangeLocal(anchor), [anchor]);

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let live = true;

    async function run() {
      if (!uid) return;

      setLoading(true);
      setErr(null);

      try {
        // Convert the local [since, until) dates into inclusive YMD bounds for Firestore queries.
        const ymdStart: YMD = toYMDLocal(since);
        const endMinusOne = new Date(until);
        endMinusOne.setDate(endMinusOne.getDate() - 1);
        const ymdEnd: YMD = toYMDLocal(endMinusOne);

        const docs: EventDoc[] = await listEvents(uid, {
          type,
          ymdStart,
          ymdEnd,
          limit: 500,
        });

        const map: Record<YMD, boolean> = {};
        for (const e of docs) {
          const dt = tsToDate(e.ts);
          if (dt) map[toYMDLocal(dt)] = true;
        }

        if (live) setHasLogs(map);
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (live) setLoading(false);
      }
    }

    run();
    return () => {
      live = false;
    };
    // Include since/until directly to satisfy react-hooks/exhaustive-deps without warnings.
  }, [type, uid, since, until, refreshKey]);

  return { loading, error, days, hasLogs, reload };
}
