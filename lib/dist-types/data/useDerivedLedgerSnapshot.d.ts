import type { FailureKind } from "@/lib/api/http";
import { type TruthGetOptions } from "@/lib/api/derivedLedgerMe";
import type { DerivedLedgerReplayResponseDto } from "@/lib/contracts/derivedLedger";
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
    data: DerivedLedgerReplayResponseDto;
};
type RefetchOpts = TruthGetOptions;
export type UseDerivedLedgerSnapshotOptions = {
    enabled?: boolean;
};
export declare function useDerivedLedgerSnapshot(args: {
    day: string;
    runId?: string;
    asOf?: string;
}, options?: UseDerivedLedgerSnapshotOptions): State & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useDerivedLedgerSnapshot.d.ts.map