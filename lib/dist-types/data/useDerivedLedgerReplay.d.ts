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
} | {
    status: "ready";
    data: DerivedLedgerReplayResponseDto;
};
type RefetchOpts = TruthGetOptions;
export type UseDerivedLedgerReplayOptions = {
    enabled?: boolean;
};
export declare function useDerivedLedgerReplay(args: {
    day: string;
    runId?: string;
    asOf?: string;
}, options?: UseDerivedLedgerReplayOptions): State & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useDerivedLedgerReplay.d.ts.map