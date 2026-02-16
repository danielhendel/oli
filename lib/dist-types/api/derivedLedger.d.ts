import type { ApiResult } from "@/lib/api/http";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import type { DerivedLedgerReplayResponseDto, DerivedLedgerRunsResponseDto } from "@/lib/contracts/derivedLedger";
export declare const getDerivedLedgerRuns: (day: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<DerivedLedgerRunsResponseDto>>;
export declare const getDerivedLedgerReplay: (args: {
    day: string;
    runId?: string;
    asOf?: string;
}, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<DerivedLedgerReplayResponseDto>>;
//# sourceMappingURL=derivedLedger.d.ts.map