// lib/api/ingest.ts
import type { ApiFailure } from "./http";
import { apiDeleteZodAuthed, apiPostZodAuthed } from "./validate";
import {
  deleteRawEventResponseDtoSchema,
  ingestAcceptedResponseDtoSchema,
  type DeleteRawEventResponseDto,
  type IngestAcceptedResponseDto,
} from "@oli/contracts";

export type IngestAccepted = IngestAcceptedResponseDto;

export type IngestOk = { ok: true; status: 202; data: IngestAccepted; requestId: string | null };
export type IngestFail = {
  ok: false;
  status: number;
  requestId: string | null;
  kind: ApiFailure["kind"];
  error: string;
  json?: ApiFailure["json"];
};

/**
 * Ingest a raw event via POST /ingest. Always supplies Idempotency-Key.
 * Returns ApiResult-like shape; preserves requestId on failures.
 * Use this when you have a deterministic idempotency key (e.g. Apple Health derived).
 */
export async function ingestRawEvent(
  body: unknown,
  idToken: string,
  opts: { idempotencyKey: string; timeoutMs?: number },
): Promise<IngestOk | IngestFail> {
  const res = await apiPostZodAuthed("/ingest", body, idToken, ingestAcceptedResponseDtoSchema, {
    idempotencyKey: opts.idempotencyKey,
    ...(typeof opts.timeoutMs === "number" ? { timeoutMs: opts.timeoutMs } : {}),
  });

  if (res.ok) {
    return { ok: true, status: 202, data: res.json, requestId: res.requestId };
  }

  return {
    ok: false,
    status: res.status,
    requestId: res.requestId,
    kind: res.kind,
    error: res.error,
    ...(res.json !== undefined ? { json: res.json } : {}),
  };
}

export async function ingestRawEventAuthed(
  body: unknown,
  idToken: string,
  opts?: { idempotencyKey?: string; timeoutMs?: number },
): Promise<IngestOk | IngestFail> {
  const res = await apiPostZodAuthed("/ingest", body, idToken, ingestAcceptedResponseDtoSchema, {
    ...(opts?.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : {}),
    ...(typeof opts?.timeoutMs === "number" ? { timeoutMs: opts.timeoutMs } : {}),
  });

  if (res.ok) {
    return { ok: true, status: 202, data: res.json, requestId: res.requestId };
  }

  return {
    ok: false,
    status: res.status,
    requestId: res.requestId,
    kind: res.kind,
    error: res.error,
    ...(res.json !== undefined ? { json: res.json } : {}),
  };
}

export type DeleteIngestedRawEventOk = {
  ok: true;
  status: 200;
  data: DeleteRawEventResponseDto;
  requestId: string | null;
};

export type DeleteIngestedRawEventFail = {
  ok: false;
  status: number;
  requestId: string | null;
  kind: ApiFailure["kind"];
  error: string;
  json?: ApiFailure["json"];
};

/**
 * Delete a user-ingested workout RawEvent via DELETE /ingest/:rawEventId (server allows manual provider only).
 */
export async function deleteIngestedRawEventAuthed(
  rawEventId: string,
  idToken: string,
  opts?: { timeoutMs?: number },
): Promise<DeleteIngestedRawEventOk | DeleteIngestedRawEventFail> {
  const path = `/ingest/${encodeURIComponent(rawEventId)}`;
  const res = await apiDeleteZodAuthed(path, idToken, deleteRawEventResponseDtoSchema, {
    ...(typeof opts?.timeoutMs === "number" ? { timeoutMs: opts.timeoutMs } : {}),
  });

  if (res.ok) {
    return { ok: true, status: 200, data: res.json, requestId: res.requestId };
  }

  return {
    ok: false,
    status: res.status,
    requestId: res.requestId,
    kind: res.kind,
    error: res.error,
    ...(res.json !== undefined ? { json: res.json } : {}),
  };
}
