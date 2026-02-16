import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { RawEventsListResponseDto } from "@oli/contracts";
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
} | {
    status: "ready";
    data: RawEventsListResponseDto;
};
export type UseRawEventsArgs = {
    start?: string;
    end?: string;
    kinds?: string[];
    provenance?: string[];
    uncertaintyState?: string[];
    q?: string;
    cursor?: string;
    limit?: number;
};
export declare function useRawEvents(args: UseRawEventsArgs, options?: {
    enabled?: boolean;
}): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useRawEvents.d.ts.map