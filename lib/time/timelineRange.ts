/**
 * Timeline range utilities for day/week/month navigation.
 * Deterministic: same anchor + viewMode → same { start, end }.
 */

export type TimelineViewMode = "day" | "week" | "month";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function isValidDayKey(d: string): boolean {
  return YYYY_MM_DD.test(d) && !Number.isNaN(Date.parse(d + "T12:00:00.000Z"));
}

export function getRangeForViewMode(
  anchorDay: string,
  viewMode: TimelineViewMode,
): { start: string; end: string } {
  if (!isValidDayKey(anchorDay)) {
    const today = new Date();
    anchorDay = today.toISOString().slice(0, 10);
  }
  const anchor = new Date(anchorDay + "T12:00:00.000Z");
  const start = new Date(anchor);
  const end = new Date(anchor);

  switch (viewMode) {
    case "day":
      start.setUTCDate(anchor.getUTCDate() - 3);
      end.setUTCDate(anchor.getUTCDate() + 3);
      break;
    case "week":
      start.setUTCDate(anchor.getUTCDate() - 7);
      end.setUTCDate(anchor.getUTCDate() + 7);
      break;
    case "month":
      start.setUTCDate(anchor.getUTCDate() - 15);
      end.setUTCDate(anchor.getUTCDate() + 15);
      break;
    default:
      start.setUTCDate(anchor.getUTCDate() - 15);
      end.setUTCDate(anchor.getUTCDate() + 15);
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function shiftAnchor(anchorDay: string, deltaDays: number): string {
  if (!isValidDayKey(anchorDay)) {
    return new Date().toISOString().slice(0, 10);
  }
  const d = new Date(anchorDay + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function getDaysVisible(viewMode: TimelineViewMode): number {
  switch (viewMode) {
    case "day":
      return 7;
    case "week":
      return 14;
    case "month":
      return 30;
    default:
      return 30;
  }
}
