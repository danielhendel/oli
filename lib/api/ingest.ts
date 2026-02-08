// lib/api/ingest.ts
import type { ApiFailure } from "./http";
import { apiPostZodAuthed } from "./validate";
import { ingestAcceptedResponseDtoSchema, type IngestAcceptedResponseDto } from "@oli/contracts";

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
