import type { LabResultsListResponseDto } from "@/lib/contracts";
import type { GetOptions } from "@/lib/api/http";
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
} | {
    status: "ready";
    data: {
        items: LabResultsListResponseDto["items"];
        nextCursor: string | null;
    };
};
export declare function useLabResults(opts?: {
    limit?: number;
} & GetOptions): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useLabResults.d.ts.map