// lib/logging/hooks.ts
import { useEffect, useMemo, useState } from "react";
import { onSnapshot, query, where, FirestoreError } from "firebase/firestore";
import { eventsCol } from "../db/paths";
import type { EventType } from "./types";

/** Format Date -> 'YYYY-MM-DD' in local time */
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromYMD(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`);
}

function addDays(ymd: string, delta: number): string {
  const d = fromYMD(ymd);
  d.setDate(d.getDate() + delta);
  return toYMD(d);
}

function weekBounds(baseYmd: string) {
  const d = fromYMD(baseYmd);
  const sundayIndex = d.getDay(); // 0..6
  const start = addDays(baseYmd, -sundayIndex);
  const days: string[] = new Array(7).fill(null).map((_, i) => addDays(start, i));
  const end = days[6];
  return { start, end, days };
}

/**
 * For the visible week around `baseYmd`, return a map { ymd: boolean }
 * indicating whether any events of `type` exist for that day.
 */
export function useHasLogsMap(
  type: EventType,
  uid: string | null | undefined,
  baseYmd: string
): { hasLogsMap: Record<string, boolean> } {
  const [map, setMap] = useState<Record<string, boolean>>({});
  const bounds = useMemo(() => weekBounds(baseYmd), [baseYmd]);

  useEffect(() => {
    // default: turn everything off until we know otherwise
    const off: Record<string, boolean> = {};
    bounds.days.forEach((d) => {
      off[d] = false;
    });

    if (!uid) {
      setMap(off);
      return;
    }

    const q = query(
      eventsCol(uid),
      where("type", "==", type),
      where("ymd", ">=", bounds.start),
      where("ymd", "<=", bounds.end)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Record<string, boolean> = { ...off };
        snap.forEach((doc) => {
          const y = doc.get("ymd");
          if (typeof y === "string" && y in next) next[y] = true;
        });
        setMap(next);
      },
      (err: FirestoreError) => {
        // Fail closed (no rings) and surface a concise console hint.
        setMap(off);
        if (err.code === "permission-denied") {
          console.warn(
            "[useHasLogsMap] Firestore permission-denied for week query. Check rules & current user uid.",
            { code: err.code, uid, type, bounds }
          );
        } else {
          console.warn("[useHasLogsMap] Firestore snapshot error:", err);
        }
      }
    );

    return () => unsub();
  }, [uid, type, bounds]); // include `bounds` to satisfy exhaustive-deps

  return { hasLogsMap: map };
}
