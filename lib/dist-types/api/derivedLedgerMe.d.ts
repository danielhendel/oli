import type { ApiResult } from "@/lib/api/http";
import type { TruthGetOptions } from "@/lib/api/usersMe";
export type { TruthGetOptions };
import { type DerivedLedgerReplayResponseDto, type DerivedLedgerRunsResponseDto } from "@/lib/contracts/derivedLedger";
export declare function getDerivedLedgerRuns(day: string, idToken: string, opts?: TruthGetOptions): Promise<ApiResult<DerivedLedgerRunsResponseDto>>;
export declare function getDerivedLedgerReplay(args: {
    day: string;
    runId?: string;
    asOf?: string;
}, idToken: string, opts?: TruthGetOptions): Promise<ApiResult<DerivedLedgerReplayResponseDto>>;
/**
 * Sprint 1 — GET /users/me/derived-ledger/snapshot (alias for replay)
 */
export declare function getDerivedLedgerSnapshot(args: {
    day: string;
    runId?: string;
    asOf?: string;
}, idToken: string, opts?: TruthGetOptions): Promise<ApiResult<DerivedLedgerReplayResponseDto>>;
//# sourceMappingURL=derivedLedgerMe.d.ts.map