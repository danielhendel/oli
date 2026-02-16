import type { UploadsPresenceResponseDto } from "@oli/contracts";
import type { GetOptions } from "@/lib/api/http";
export type UploadsPresence = {
    count: number;
    latest: UploadsPresenceResponseDto["latest"];
};
type State = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
} | {
    status: "ready";
    data: UploadsPresence;
};
export declare function useUploadsPresence(): State & {
    refetch: (opts?: GetOptions) => void;
};
export {};
//# sourceMappingURL=useUploadsPresence.d.ts.map