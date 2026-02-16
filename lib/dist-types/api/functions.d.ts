/**
 * Sprint 2 — Generic function caller.
 * RATIONALE: callFunctionAuthed is a generic HTTP trigger for arbitrary Cloud Functions.
 * No fixed DTO schema exists; responses are caller-typed (T = JsonValue by default).
 * Client callers that need structured responses MUST validate at the call site with their own schema.
 */
import type { ApiResult, JsonValue } from "./http";
type CallFunctionOk<T> = {
    ok: true;
    data: T;
};
type CallFunctionFail = {
    ok: false;
    error: string;
};
export declare function callFunctionAuthed<T = JsonValue>(name: string, body: unknown, idToken: string): Promise<ApiResult<CallFunctionOk<T> | CallFunctionFail>>;
export declare function callAdminFunction<T = JsonValue>(name: string, body: unknown, idToken: string): Promise<ApiResult<CallFunctionOk<T> | CallFunctionFail>>;
export {};
//# sourceMappingURL=functions.d.ts.map