import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { TimelineResponseDto } from "@oli/contracts";
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
} | {
    status: "ready";
    data: TimelineResponseDto;
    fromCache?: boolean;
};
export type UseTimelineArgs = {
    start: string;
    end: string;
};
export declare function useTimeline(args: UseTimelineArgs, options?: {
    enabled?: boolean;
}): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useTimeline.d.ts.map