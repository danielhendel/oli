/**
 * Sprint 2 — Client Trust Layer: Runtime validation at the server truth boundary.
 *
 * All API functions returning typed DTOs MUST use these helpers.
 * - res.ok === false: returned unchanged (preserve http/network behavior)
 * - res.ok === true: schema.safeParse(res.json)
 *   - success: return ApiOk with parsed data
 *   - failure: return ApiFailure kind="contract" (fail-closed, never cast)
 */
import type { ApiResult } from "@/lib/api/http";
import type { GetOptions, PostOptions, PutOptions } from "@/lib/api/http";
import type { z } from "zod";
export declare function apiGetZodAuthed<T>(path: string, idToken: string, schema: z.ZodType<T>, opts?: GetOptions): Promise<ApiResult<T>>;
export declare function apiPostZodAuthed<T>(path: string, body: unknown, idToken: string, schema: z.ZodType<T>, opts?: PostOptions): Promise<ApiResult<T>>;
export declare function apiPutZodAuthed<T>(path: string, body: unknown, idToken: string, schema: z.ZodType<T>, opts?: PutOptions): Promise<ApiResult<T>>;
//# sourceMappingURL=validate.d.ts.map