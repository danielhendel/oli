// lib/api/ingest.ts
import type { ApiFailure, ApiResult } from "./http";
import { apiPostJsonAuthed } from "./http";

export type IngestAccepted = { ok: true; rawEventId: string; day?: string };

export type IngestOk = { ok: true; status: 202; data: IngestAccepted; requestId: string | null };
export type IngestFail = {
  ok: false;
  status: number;
  requestId: string | null;
  kind: ApiFailure["kind"];
  error: string;
};

export type IngestResult = IngestOk | IngestFail;

export const ingestRawEvent = async (
  body: unknown,
  idToken: string,
  config?: { idempotencyKey?: string },
): Promise<IngestResult> => {
  const res: ApiResult<IngestAccepted> = await apiPostJsonAuthed<IngestAccepted>("/ingest/events", body, idToken, config);

  if (res.ok) {
    return { ok: true, status: 202, data: res.json, requestId: res.requestId };
  }

  return {
    ok: false,
    status: res.status,
    requestId: res.requestId,
    kind: res.kind,
    error: res.error,
  };
};
