import { type TruthGetOptions } from "@/lib/api/usersMe";
import type { DailyFactsDto } from "@/lib/contracts";
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
    data: DailyFactsDto;
};
type RefetchOpts = TruthGetOptions;
export declare function useDailyFacts(day: string): State & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useDailyFacts.d.ts.map