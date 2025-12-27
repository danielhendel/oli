// lib/api/ingest.ts

import { apiPostJsonAuthed, type FailureKind } from "./http";
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
  ok: true;
  status: "accepted";
  rawEventId: string;
  idempotentReplay?: boolean;
};

type OkResult = { ok: true; status: 202; data: IngestAccepted; requestId: string };
type ErrorResult = {
  ok: false;
  status: number;
  message: string;
  kind: FailureKind;
  requestId: string;
  details?: JsonValue;
};

export type IngestResult = OkResult | ErrorResult;

const messageFromJson = (json: JsonValue | undefined): string | null => {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const rec = json as Record<string, JsonValue>;

  // Prefer structured envelope: { ok:false, error:{ message } }
  const err = rec["error"];
  if (err && typeof err === "object" && !Array.isArray(err)) {
    const msg = (err as Record<string, JsonValue>)["message"];
    if (typeof msg === "string") return msg;
  }

  // Legacy: { error: "string" }
  const legacy = rec["error"];
  if (typeof legacy === "string") return legacy;

  return null;
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
    return { ok: true, status: 202, data: res.json as unknown as IngestAccepted, requestId: res.requestId };
  }

  const msg = messageFromJson(res.json) ?? res.error;
  return {
    ok: false,
    status: res.status,
    message: msg,
    kind: res.kind,
    requestId: res.requestId,
    ...(res.json ? { details: res.json } : {}),
  };
};
