import { type TruthGetOptions } from "@/lib/api/usersMe";
import type { HealthScoreDoc } from "@/lib/contracts";
import type { FailureKind } from "@/lib/api/http";
export type HealthScoreState = {
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
    data: HealthScoreDoc;
};
type RefetchOpts = TruthGetOptions;
export declare function useHealthScore(day: string): HealthScoreState & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useHealthScore.d.ts.map