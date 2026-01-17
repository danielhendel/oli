// lib/api/derivedLedgerMe.ts
import type { ApiFailure, ApiResult, JsonValue } from "@/lib/api/http";
import { apiGetJsonAuthed } from "@/lib/api/http";

import {
  derivedLedgerReplayResponseDtoSchema,
  derivedLedgerRunsResponseDtoSchema,
  type DerivedLedgerReplayResponseDto,
  type DerivedLedgerRunsResponseDto,
} from "@/lib/contracts/derivedLedger";

export type TruthGetOptions = {
  cacheBust?: string;
};

function truthGetOpts(opts?: TruthGetOptions) {
  return {
    noStore: true as const,
    ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
  };
}

function isJsonValue(v: unknown): v is JsonValue {
  if (v === null) return true;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (Array.isArray(v)) return v.every(isJsonValue);
  if (t === "object") {
    const rec = v as Record<string, unknown>;
    return Object.values(rec).every(isJsonValue);
  }
  return false;
}

function attachJsonIfSafe(failure: ApiFailure, jsonUnknown: unknown): ApiFailure {
  // ApiFailure.json?: JsonValue (optional). With exactOptionalPropertyTypes, we must not pass undefined explicitly.
  if (jsonUnknown !== undefined && isJsonValue(jsonUnknown)) {
    return { ...failure, json: jsonUnknown };
  }
  return failure;
}

export async function getDerivedLedgerRuns(
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DerivedLedgerRunsResponseDto>> {
  const res = await apiGetJsonAuthed<unknown>(
    `/users/me/derived-ledger/runs?day=${encodeURIComponent(day)}`,
    idToken,
    truthGetOpts(opts),
  );

  if (!res.ok) return res as ApiResult<DerivedLedgerRunsResponseDto>;

  const parsed = derivedLedgerRunsResponseDtoSchema.safeParse(res.json);
  if (!parsed.success) {
    const base: ApiFailure = {
      ok: false,
      status: res.status,
      kind: "parse",
      error: "Invalid DerivedLedgerRuns response",
      requestId: res.requestId,
    };
    return attachJsonIfSafe(base, res.json) as ApiResult<DerivedLedgerRunsResponseDto>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
  };
}

export async function getDerivedLedgerReplay(
  args: { day: string; runId?: string; asOf?: string },
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DerivedLedgerReplayResponseDto>> {
  const params = new URLSearchParams({ day: args.day });
  if (args.runId) params.set("runId", args.runId);
  if (args.asOf) params.set("asOf", args.asOf);

  const res = await apiGetJsonAuthed<unknown>(
    `/users/me/derived-ledger/replay?${params.toString()}`,
    idToken,
    truthGetOpts(opts),
  );

  if (!res.ok) return res as ApiResult<DerivedLedgerReplayResponseDto>;

  const parsed = derivedLedgerReplayResponseDtoSchema.safeParse(res.json);
  if (!parsed.success) {
    const base: ApiFailure = {
      ok: false,
      status: res.status,
      kind: "parse",
      error: "Invalid DerivedLedgerReplay response",
      requestId: res.requestId,
    };
    return attachJsonIfSafe(base, res.json) as ApiResult<DerivedLedgerReplayResponseDto>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
  };
}
