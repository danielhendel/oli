// lib/api/ingest.ts

import { apiPostJsonAuthed } from "./http";
import type { JsonValue } from "./http";

export type RawEventKind = "sleep" | "steps" | "workout" | "weight" | "hrv";

export type IngestRawEventBody = {
  provider?: "manual";
  kind: RawEventKind;
  observedAt?: string;
  occurredAt?: string;
  sourceId?: string;
  payload: unknown;
};

export type IngestAccepted = {
  status: "accepted";
  rawEventId: string;
  idempotentReplay?: boolean;
};

type OkResult = { ok: true; status: 202; data: IngestAccepted };
type ErrorResult = { ok: false; status: number; message: string; details?: JsonValue };

export type IngestResult = OkResult | ErrorResult;

const messageFromJson = (json: JsonValue | undefined): string | null => {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const rec = json as Record<string, JsonValue>;
  const e = rec["error"];
  return typeof e === "string" ? e : null;
};

/**
 * POST /ingest/events
 * Writes RawEvent -> triggers normalization pipeline.
 */
export const ingestRawEvent = async (
  body: IngestRawEventBody,
  idToken: string,
  opts?: { idempotencyKey?: string }
): Promise<IngestResult> => {
  const config =
    opts?.idempotencyKey !== undefined
      ? { idempotencyKey: opts.idempotencyKey }
      : undefined;

  const res = await apiPostJsonAuthed("/ingest/events", body, idToken, config);

  if (res.ok) {
    return { ok: true, status: 202, data: res.json as unknown as IngestAccepted };
  }

  const msg = messageFromJson(res.json) ?? res.error;
  return { ok: false, status: res.status, message: msg, ...(res.json ? { details: res.json } : {}) };
};
