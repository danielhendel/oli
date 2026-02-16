import type { ApiResult } from "@/lib/api/http";
import type { FailureKind } from "@/lib/api/http";
export type TruthOutcome<T> = {
    status: "ready";
    data: T;
} | {
    status: "missing";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
};
export declare function truthOutcomeFromApiResult<T>(res: ApiResult<T>): TruthOutcome<T>;
//# sourceMappingURL=truthOutcome.d.ts.map