// lib/api/derivedLedgerMe.ts
import type { ApiResult } from "@/lib/api/http";
import { apiGetJsonAuthed } from "@/lib/api/http";

import type { TruthGetOptions } from "@/lib/api/usersMe";

import type {
  DerivedLedgerReplayResponseDto,
  DerivedLedgerRunsResponseDto,
} from "@/lib/contracts/derivedLedger";

function truthGetOpts(opts?: TruthGetOptions) {
  return {
    noStore: true as const,
    ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
  };
}

export const getDerivedLedgerRuns = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DerivedLedgerRunsResponseDto>> => {
  return apiGetJsonAuthed<DerivedLedgerRunsResponseDto>(
    `/users/me/derived-ledger/runs?day=${encodeURIComponent(day)}`,
    idToken,
    truthGetOpts(opts),
  );
};

export const getDerivedLedgerReplay = async (
  args: {
    day: string;
    runId?: string;
    asOf?: string;
  },
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DerivedLedgerReplayResponseDto>> => {
  const params = new URLSearchParams({ day: args.day });
  if (args.runId) params.set("runId", args.runId);
  if (args.asOf) params.set("asOf", args.asOf);

  return apiGetJsonAuthed<DerivedLedgerReplayResponseDto>(
    `/users/me/derived-ledger/replay?${params.toString()}`,
    idToken,
    truthGetOpts(opts),
  );
};
