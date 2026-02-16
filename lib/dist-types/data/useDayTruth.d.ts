import { type TruthGetOptions } from "@/lib/api/usersMe";
import type { DayTruthDto } from "@/lib/contracts";
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
    data: DayTruthDto;
};
type RefetchOpts = TruthGetOptions;
export declare function useDayTruth(day: string): State & {
    refetch: (opts?: RefetchOpts) => void;
};
export {};
//# sourceMappingURL=useDayTruth.d.ts.map