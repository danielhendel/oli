import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { CanonicalEventsListResponseDto } from "@oli/contracts";
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
} | {
    status: "ready";
    data: CanonicalEventsListResponseDto;
    fromCache?: boolean;
};
export type UseEventsArgs = {
    start?: string;
    end?: string;
    kinds?: string[];
    cursor?: string;
    limit?: number;
};
export declare function useEvents(args: UseEventsArgs, options?: {
    enabled?: boolean;
}): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useEvents.d.ts.map