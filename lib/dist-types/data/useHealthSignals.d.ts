import { type TruthGetOptions } from "@/lib/api/usersMe";
import type { HealthSignalDoc } from "@oli/contracts";
import type { FailureKind } from "@/lib/api/http";
export type HealthSignalsState = {
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
    data: HealthSignalDoc;
};
type RefetchOpts = TruthGetOptions;
export declare function useHealthSignals(day: string): HealthSignalsState & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useHealthSignals.d.ts.map