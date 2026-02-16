import { type TruthGetOptions } from "@/lib/api/usersMe";
import type { IntelligenceContextDto } from "@/lib/contracts";
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
    data: IntelligenceContextDto;
};
type RefetchOpts = TruthGetOptions;
export declare function useIntelligenceContext(day: string): State & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useIntelligenceContext.d.ts.map