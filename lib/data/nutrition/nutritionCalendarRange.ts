// lib/data/nutrition/nutritionCalendarRange.ts
import { getEvents } from "@/lib/api/usersMe";
import type { DayKey } from "@/lib/ui/calendar/types";

const PAGE_LIMIT = 500;

/**
 * Lists all calendar days in [start, end] that have at least one canonical `nutrition` event (paginates cursors).
 */
export async function fetchNutritionLoggedDaysInRange(
  idToken: string,
  start: DayKey,
  end: DayKey,
): Promise<{ ok: true; days: Set<DayKey> } | { ok: false; error: string; requestId: string | null }> {
  const days = new Set<DayKey>();
  let cursor: string | undefined;

  for (;;) {
    const res = await getEvents(idToken, {
      start,
      end,
      kinds: ["nutrition"],
      limit: PAGE_LIMIT,
      ...(cursor != null && cursor !== "" ? { cursor } : {}),
    });

    if (!res.ok) {
      return { ok: false, error: res.error, requestId: res.requestId };
    }

    const body = res.json;
    for (const item of body.items) {
      if (item.kind === "nutrition" && typeof item.day === "string") {
        days.add(item.day as DayKey);
      }
    }

    const next = body.nextCursor;
    if (next == null || next === "") break;
    cursor = next;
  }

  return { ok: true, days };
}
