import type { ApiFailure } from "./http";
import { type IngestAcceptedResponseDto } from "@oli/contracts";
export type IngestAccepted = IngestAcceptedResponseDto;
export type IngestOk = {
    ok: true;
    status: 202;
    data: IngestAccepted;
    requestId: string | null;
};
export type IngestFail = {
    ok: false;
    status: number;
    requestId: string | null;
    kind: ApiFailure["kind"];
    error: string;
    json?: ApiFailure["json"];
};
export declare function ingestRawEventAuthed(body: unknown, idToken: string, opts?: {
    idempotencyKey?: string;
    timeoutMs?: number;
}): Promise<IngestOk | IngestFail>;
//# sourceMappingURL=ingest.d.ts.map