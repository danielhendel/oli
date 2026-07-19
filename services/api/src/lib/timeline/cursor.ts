/**
 * Opaque Timeline feed cursor — encodes last (occurredAt, kindPriority, id, day).
 * Never log or return decoded fields to clients beyond the opaque string.
 */

export type TimelineFeedCursorPayload = {
  day: string;
  occurredAt: string;
  kindPriority: number;
  id: string;
};

export function encodeTimelineFeedCursor(payload: TimelineFeedCursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeTimelineFeedCursor(cursor: string): TimelineFeedCursorPayload | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<TimelineFeedCursorPayload>;
    if (
      typeof parsed.day !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.day) ||
      typeof parsed.occurredAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.occurredAt)) ||
      typeof parsed.kindPriority !== "number" ||
      !Number.isFinite(parsed.kindPriority) ||
      typeof parsed.id !== "string" ||
      parsed.id.length === 0
    ) {
      return null;
    }
    return {
      day: parsed.day,
      occurredAt: parsed.occurredAt,
      kindPriority: parsed.kindPriority,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}
