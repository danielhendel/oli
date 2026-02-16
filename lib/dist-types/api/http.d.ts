export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {
    [key: string]: JsonValue;
};
export type FailureKind = "network" | "http" | "parse" | "contract" | "unknown";
export type ApiOk<T> = {
    ok: true;
    status: number;
    requestId: string | null;
    json: T;
};
export type ApiFailure = {
    ok: false;
    status: number;
    kind: FailureKind;
    error: string;
    requestId: string | null;
    json?: JsonValue;
};
export type ApiResult<T> = ApiOk<T> | ApiFailure;
export type GetOptions = {
    cacheBust?: string;
    noStore?: boolean;
    timeoutMs?: number;
};
export type PostOptions = {
    idempotencyKey?: string;
    timeoutMs?: number;
    noStore?: boolean;
};
export type PutOptions = {
    timeoutMs?: number;
    noStore?: boolean;
};
export declare function apiGetJsonAuthed<T>(path: string, idToken: string, opts?: GetOptions): Promise<ApiResult<T>>;
export declare function apiPostJsonAuthed<T>(path: string, body: unknown, idToken: string, opts?: PostOptions): Promise<ApiResult<T>>;
export declare function apiPutJsonAuthed<T>(path: string, body: unknown, idToken: string, opts?: PutOptions): Promise<ApiResult<T>>;
//# sourceMappingURL=http.d.ts.map