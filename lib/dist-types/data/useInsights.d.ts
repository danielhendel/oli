import { type TruthGetOptions } from "@/lib/api/usersMe";
import type { InsightsResponseDto } from "@/lib/contracts";
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
    data: InsightsResponseDto;
};
type RefetchOpts = TruthGetOptions;
export declare function useInsights(day: string): State & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useInsights.d.ts.map