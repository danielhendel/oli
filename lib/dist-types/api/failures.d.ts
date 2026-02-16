import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { type FailureListResponseDto } from "@/lib/contracts/failure";
export declare function getFailures(day: string, idToken: string, opts?: {
    limit?: number;
    cursor?: string;
} & GetOptions): Promise<ApiResult<FailureListResponseDto>>;
export declare function getFailuresRange(args: {
    start: string;
    end: string;
    limit?: number;
    cursor?: string;
}, idToken: string, opts?: GetOptions): Promise<ApiResult<FailureListResponseDto>>;
//# sourceMappingURL=failures.d.ts.map