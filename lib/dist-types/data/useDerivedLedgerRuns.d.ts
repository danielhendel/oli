import type { FailureKind } from "@/lib/api/http";
import { type TruthGetOptions } from "@/lib/api/derivedLedgerMe";
import type { DerivedLedgerRunsResponseDto } from "@/lib/contracts/derivedLedger";
type State = {
    status: "partial";
} | {
    status: "missing";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
} | {
    status: "ready";
    data: DerivedLedgerRunsResponseDto;
};
type RefetchOpts = TruthGetOptions;
export type UseDerivedLedgerRunsOptions = {
    enabled?: boolean;
};
export declare function useDerivedLedgerRuns(day: string, options?: UseDerivedLedgerRunsOptions): State & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useDerivedLedgerRuns.d.ts.map