// lib/api/ingest.ts
import type { ApiFailure } from "./http";
import { apiDeleteJsonAuthed } from "./http";
import { apiPostZodAuthed } from "./validate";
import {
  deleteRawEventDelete404ResponseBodySchema,
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
  /** 200 = deleted now; 404 = already absent (idempotent delete). */
  status: 200 | 404;
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
  const res = await apiDeleteJsonAuthed<unknown>(path, idToken, {
    ...(typeof opts?.timeoutMs === "number" ? { timeoutMs: opts.timeoutMs } : {}),
  });

  const headerRequestId = res.requestId?.trim() ? res.requestId : null;

  if (!res.ok && res.status === 404) {
    const parsed404 = deleteRawEventDelete404ResponseBodySchema.safeParse(res.json);
    if (parsed404.success) {
      const data: DeleteRawEventResponseDto = {
        ok: true,
        rawEventId,
        requestId:
          parsed404.data.requestId.trim().length > 0 ? parsed404.data.requestId : headerRequestId ?? "unknown",
        suppressionWritten: parsed404.data.suppressionWritten,
      };
      return { ok: true, status: 404, data, requestId: headerRequestId ?? parsed404.data.requestId };
    }
    return {
      ok: false,
      status: 404,
      requestId: res.requestId,
      kind: "contract",
      error: "Invalid response shape",
      ...(res.json !== undefined ? { json: res.json as ApiFailure["json"] } : {}),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      requestId: res.requestId,
      kind: res.kind,
      error: res.error,
      ...(res.json !== undefined ? { json: res.json as ApiFailure["json"] } : {}),
    };
  }

  if (res.json === null || res.json === undefined) {
    return {
      ok: true,
      status: 200,
      data: {
        ok: true,
        rawEventId,
        requestId: headerRequestId ?? "unknown",
        suppressionWritten: false,
      },
      requestId: res.requestId,
    };
  }

  const parsed200 = deleteRawEventResponseDtoSchema.safeParse(res.json);
  if (parsed200.success) {
    const row = parsed200.data;
    const mergedRequestId =
      row.requestId === "unknown" && headerRequestId && headerRequestId.length > 0
        ? headerRequestId
        : row.requestId;
    return {
      ok: true,
      status: 200,
      data: { ...row, requestId: mergedRequestId },
      requestId: res.requestId,
    };
  }

  return {
    ok: false,
    status: res.status,
    requestId: res.requestId,
    kind: "contract",
    error: "Invalid response shape",
    ...(isRecord(res.json) ? { json: res.json as ApiFailure["json"] } : {}),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
