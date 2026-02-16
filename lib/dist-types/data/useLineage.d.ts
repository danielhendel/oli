import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { LineageResponseDto } from "@oli/contracts";
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
} | {
    status: "missing";
} | {
    status: "ready";
    data: LineageResponseDto;
};
export type UseLineageArgs = {
    canonicalEventId: string;
} | {
    day: string;
    kind: string;
    observedAt: string;
};
export declare function useLineage(args: UseLineageArgs, options?: {
    enabled?: boolean;
}): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useLineage.d.ts.map