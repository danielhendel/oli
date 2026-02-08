// lib/api/derivedLedgerMe.ts
import type { ApiResult } from "@/lib/api/http";
import type { TruthGetOptions } from "@/lib/api/usersMe";

export type { TruthGetOptions };
import { apiGetZodAuthed } from "@/lib/api/validate";
import {
  derivedLedgerReplayResponseDtoSchema,
  derivedLedgerRunsResponseDtoSchema,
  type DerivedLedgerReplayResponseDto,
  type DerivedLedgerRunsResponseDto,
} from "@/lib/contracts/derivedLedger";

function truthGetOpts(opts?: TruthGetOptions) {
  return {
    noStore: true as const,
    ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
  };
}

export async function getDerivedLedgerRuns(
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DerivedLedgerRunsResponseDto>> {
  return apiGetZodAuthed(
    `/users/me/derived-ledger/runs?day=${encodeURIComponent(day)}`,
    idToken,
    derivedLedgerRunsResponseDtoSchema,
    truthGetOpts(opts),
  );
}

export async function getDerivedLedgerReplay(
  args: { day: string; runId?: string; asOf?: string },
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DerivedLedgerReplayResponseDto>> {
  const params = new URLSearchParams({ day: args.day });
  if (args.runId) params.set("runId", args.runId);
  if (args.asOf) params.set("asOf", args.asOf);

  return apiGetZodAuthed(
    `/users/me/derived-ledger/replay?${params.toString()}`,
    idToken,
    derivedLedgerReplayResponseDtoSchema,
    truthGetOpts(opts),
  );
}

/**
 * Sprint 1 — GET /users/me/derived-ledger/snapshot (alias for replay)
 */
export async function getDerivedLedgerSnapshot(
  args: { day: string; runId?: string; asOf?: string },
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DerivedLedgerReplayResponseDto>> {
  const params = new URLSearchParams({ day: args.day });
  if (args.runId) params.set("runId", args.runId);
  if (args.asOf) params.set("asOf", args.asOf);

  return apiGetZodAuthed(
    `/users/me/derived-ledger/snapshot?${params.toString()}`,
    idToken,
    derivedLedgerReplayResponseDtoSchema,
    truthGetOpts(opts),
  );
}
