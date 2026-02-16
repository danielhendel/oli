// lib/logging/useDayEvents.ts
import { useCallback, useEffect, useState } from "react";
import type { EventType, UIEvent, EventDoc } from "./types";
import { readDayEvents } from "./readEvents";
import { mapToUI } from "./uiMappers";

/** UTC YYYY-MM-DD for "today" */
function todayYMDUtc(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Read all events for a given (type, uid, day) and expose UI rows.
 * Call shape matches screens: useDayEvents(type, uid, ymd?)
 */
export function useDayEvents(
  type: EventType,
  uid?: string,
  ymd?: string
): { items: UIEvent[]; loading: boolean; error: string | null; reload: () => Promise<void> } {
  const [items, setItems] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = ymd ?? todayYMDUtc();

  const fetch = useCallback(async () => {
    // If no user yet, show empty quietly.
    if (!uid) {
      setItems([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const docs: EventDoc[] = await readDayEvents(uid, type, day);
      setItems(docs.map(mapToUI));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [uid, type, day]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { items, loading, error, reload: fetch };
}
