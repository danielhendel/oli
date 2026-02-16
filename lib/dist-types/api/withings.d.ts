/**
 * Phase 3A — Withings API client.
 * All calls use authed lib/api/http; no secrets in client.
 */
import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { z } from "zod";
declare const withingsStatusResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    connected: z.ZodBoolean;
    scopes: z.ZodArray<z.ZodString, "many">;
    connectedAt: z.ZodNullable<z.ZodString>;
    revoked: z.ZodBoolean;
    failureState: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    ok: true;
    connected: boolean;
    scopes: string[];
    connectedAt: string | null;
    revoked: boolean;
    failureState: Record<string, unknown> | null;
}, {
    ok: true;
    connected: boolean;
    scopes: string[];
    connectedAt: string | null;
    revoked: boolean;
    failureState: Record<string, unknown> | null;
}>;
export type WithingsStatusResponse = z.infer<typeof withingsStatusResponseSchema>;
declare const withingsPullResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    written: z.ZodNumber;
    cursor: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    ok: true;
    cursor: number;
    written: number;
}, {
    ok: true;
    cursor: number;
    written: number;
}>;
export type WithingsPullResponse = z.infer<typeof withingsPullResponseSchema>;
/** GET /integrations/withings/status — connected flag, no tokens. */
export declare function getWithingsStatus(idToken: string, opts?: GetOptions): Promise<ApiResult<WithingsStatusResponse>>;
/** GET /integrations/withings/connect — returns OAuth URL for client to open. Requires Authorization. */
export declare function getWithingsConnectUrl(idToken: string): Promise<ApiResult<{
    url: string;
}>>;
/** Callback URL for Withings OAuth (must match backend WITHINGS_REDIRECT_URI). */
export declare function getWithingsRedirectUri(): string;
/** POST /integrations/withings/pull — admin/dev: pull new measures; requires Idempotency-Key. */
export declare function pullWithings(idToken: string, idempotencyKey: string, body: {
    timeZone: string;
    cursor?: number;
}): Promise<ApiResult<WithingsPullResponse>>;
export {};
//# sourceMappingURL=withings.d.ts.map