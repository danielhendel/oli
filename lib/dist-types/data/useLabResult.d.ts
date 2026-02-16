import type { LabResultDto } from "@/lib/contracts";
import type { TruthGetOptions } from "@/lib/api/usersMe";
type State = {
    status: "partial";
} | {
    status: "missing";
} | {
    status: "error";
    error: string;
    requestId: string | null;
} | {
    status: "ready";
    data: LabResultDto;
};
export declare function useLabResult(id: string): State & {
    refetch: (opts?: TruthGetOptions) => void;
};
export {};
//# sourceMappingURL=useLabResult.d.ts.map