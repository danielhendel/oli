import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { FailureListItemDto } from "@/lib/contracts/failure";
type Ready = {
    items: FailureListItemDto[];
    nextCursor: string | null;
    truncated: boolean;
};
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
} | {
    status: "ready";
    data: Ready;
};
export type UseFailuresRangeArgs = {
    start: string;
    end: string;
    limit?: number;
    cursor?: string;
};
export type UseFailuresRangeOptions = {
    enabled?: boolean;
    /**
     * "page" returns one API page (default).
     * "all" fetches sequential pages until exhausted or a hard cap is reached.
     */
    mode?: "page" | "all";
    /** Only applies when mode === "all" */
    maxItems?: number;
};
export declare function useFailuresRange(args: UseFailuresRangeArgs, options?: UseFailuresRangeOptions): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useFailuresRange.d.ts.map