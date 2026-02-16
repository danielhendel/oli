import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { FailureListResponseDto } from "@/lib/contracts/failure";
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
} | {
    status: "ready";
    data: FailureListResponseDto;
};
export type UseFailuresArgs = {
    day: string;
    limit?: number;
    cursor?: string;
};
export type UseFailuresOptions = {
    enabled?: boolean;
};
export declare function useFailures(args: UseFailuresArgs, options?: UseFailuresOptions): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useFailures.d.ts.map