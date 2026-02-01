// services/api/src/db/failures.ts

import type { QueryDocumentSnapshot, Timestamp } from "@google-cloud/firestore";
import { z } from "zod";
import { userCollection } from "../db";

export type FailureCursor = {
  createdAtMs: number;
  id: string;
};

const failureCursorSchema = z
  .object({
    createdAtMs: z.number().int().nonnegative(),
    id: z.string().min(1),
  })
  .strict();

export const encodeCursor = (cursor: FailureCursor): string =>
  Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");

export const decodeCursor = (cursor: string): FailureCursor => {
  const raw = Buffer.from(cursor, "base64url").toString("utf8");
  const parsed = JSON.parse(raw) as unknown;
  const validated = failureCursorSchema.safeParse(parsed);
  if (!validated.success) throw new Error("Invalid cursor");
  return validated.data;
};

export type FailureListItem = {
  id: string;
  type: string;
  code: string;
  message: string;
  day: string;

  // ✅ Step 8 read surface: ISO timestamp string
  createdAt: string;

  timeZone?: string;
  observedAt?: string;
  rawEventId?: string;
  rawEventPath?: string;
  details?: Record<string, unknown> | null;
};

export type ListFailuresResult = {
  items: FailureListItem[];
  nextCursor: string | null;
};

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const storedFailureDocSchema = z
  .object({
    userId: z.string().min(1),
    type: z.string().min(1),
    code: z.string().min(1),
    message: z.string().min(1),
    day: ymdSchema,
    createdAt: z.custom<Timestamp>((v) => {
      if (!v || typeof v !== "object") return false;
      return typeof (v as Timestamp).toMillis === "function" && typeof (v as Timestamp).toDate === "function";
    }),
    timeZone: z.string().min(1).optional(),
    observedAt: z.string().datetime().optional(),
    rawEventId: z.string().min(1).optional(),
    rawEventPath: z.string().min(1).optional(),
    details: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

function parseStoredFailureOrThrow(doc: QueryDocumentSnapshot) {
  const data = doc.data() as unknown;
  const parsed = storedFailureDocSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Invalid failure doc: ${doc.ref.path}`);
  }
  return parsed.data;
}

function toMillis(ts: Timestamp): number {
  return ts.toMillis();
}

function toIso(ts: Timestamp): string {
  return ts.toDate().toISOString();
}

function toListItem(doc: QueryDocumentSnapshot): FailureListItem {
  const v = parseStoredFailureOrThrow(doc);

  return {
    id: doc.id,
    type: v.type,
    code: v.code,
    message: v.message,
    day: v.day,
    createdAt: toIso(v.createdAt),
    ...(v.timeZone ? { timeZone: v.timeZone } : {}),
    ...(v.observedAt ? { observedAt: v.observedAt } : {}),
    ...(v.rawEventId ? { rawEventId: v.rawEventId } : {}),
    ...(v.rawEventPath ? { rawEventPath: v.rawEventPath } : {}),
    ...(v.details !== undefined ? { details: v.details } : {}),
  };
}

function computeNextCursor(docs: QueryDocumentSnapshot[]): string | null {
  const last = docs.at(-1);
  if (!last) return null;

  const v = parseStoredFailureOrThrow(last);
  return encodeCursor({ createdAtMs: toMillis(v.createdAt), id: last.id });
}

export async function listFailuresByDay(args: {
  uid: string;
  day: string;
  limit: number;
  cursor?: string;
}): Promise<ListFailuresResult> {
  const { uid, day, limit, cursor } = args;

  let q = userCollection(uid, "failures")
    .where("day", "==", day)
    .orderBy("createdAt", "asc")
    .orderBy("__name__", "asc")
    .limit(limit);

  if (cursor) {
    const decoded = decodeCursor(cursor);
    q = q.startAfter(new Date(decoded.createdAtMs), decoded.id);
  }

  const snap = await q.get();
  const docs = snap.docs;

  const items = docs.map(toListItem);
  const nextCursor = computeNextCursor(docs);

  return { items, nextCursor };
}

export async function listFailuresByCreatedAtRange(args: {
  uid: string;
  startDay: string;
  endDay: string;
  limit: number;
  cursor?: string;
}): Promise<ListFailuresResult> {
  const { uid, startDay, endDay, limit, cursor } = args;

  let q = userCollection(uid, "failures")
    .where("day", ">=", startDay)
    .where("day", "<=", endDay)
    .orderBy("createdAt", "asc")
    .orderBy("__name__", "asc")
    .limit(limit);

  if (cursor) {
    const decoded = decodeCursor(cursor);
    q = q.startAfter(new Date(decoded.createdAtMs), decoded.id);
  }

  const snap = await q.get();
  const docs = snap.docs;

  const items = docs.map(toListItem);
  const nextCursor = computeNextCursor(docs);

  return { items, nextCursor };
}
