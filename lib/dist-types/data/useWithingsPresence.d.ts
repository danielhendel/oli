import type { GetOptions } from "@/lib/api/http";
export type WithingsPresence = {
    connected: boolean;
    lastMeasurementAt: string | null;
    hasRecentData: boolean;
};
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
} | {
    status: "ready";
    data: WithingsPresence;
};
export declare function useWithingsPresence(): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useWithingsPresence.d.ts.map