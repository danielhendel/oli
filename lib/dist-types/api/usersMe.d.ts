import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { z } from "zod";
import { type ManualStrengthWorkoutPayload } from "@/lib/events/manualStrengthWorkout";
import { type LogWeightRequestDto, type LogWeightResponseDto, type DailyFactsDto, type InsightsResponseDto, type IntelligenceContextDto, type DayTruthDto, type LabResultDto, type LabResultsListResponseDto, type CreateLabResultRequestDto, type CreateLabResultResponseDto, type UploadsPresenceResponseDto, type IngestAcceptedResponseDto, type CanonicalEventsListResponseDto, type RawEventsListResponseDto, type TimelineResponseDto, type LineageResponseDto, type HealthScoreDoc, type HealthSignalDoc } from "@oli/contracts";
export type TruthGetOptions = {
    cacheBust?: string;
};
export declare const logWeight: (payload: LogWeightRequestDto, idToken: string) => Promise<ApiResult<LogWeightResponseDto>>;
export declare const logStrengthWorkout: (payload: ManualStrengthWorkoutPayload, idToken: string) => Promise<ApiResult<IngestAcceptedResponseDto>>;
export declare const getDailyFacts: (day: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<DailyFactsDto>>;
export declare const getInsights: (day: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<InsightsResponseDto>>;
export declare const getIntelligenceContext: (day: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<IntelligenceContextDto>>;
export declare const getUploads: (idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<UploadsPresenceResponseDto>>;
/** GET /integrations/withings/status — integration metadata (Phase 3A). No tokens. */
declare const withingsStatusDtoSchema: z.ZodObject<{
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
export type WithingsStatusDto = z.infer<typeof withingsStatusDtoSchema>;
export declare const getWithingsStatus: (idToken: string, opts?: GetOptions) => Promise<ApiResult<WithingsStatusDto>>;
export declare const getTimeline: (start: string, end: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<TimelineResponseDto>>;
export declare const getRawEvents: (idToken: string, opts?: {
    start?: string;
    end?: string;
    kinds?: string[];
    provenance?: string[];
    uncertaintyState?: string[];
    q?: string;
    cursor?: string;
    limit?: number;
} & TruthGetOptions) => Promise<ApiResult<RawEventsListResponseDto>>;
export declare const getEvents: (idToken: string, opts?: {
    start?: string;
    end?: string;
    kinds?: string[];
    cursor?: string;
    limit?: number;
} & TruthGetOptions) => Promise<ApiResult<CanonicalEventsListResponseDto>>;
export declare const getLineage: (idToken: string, opts: {
    canonicalEventId: string;
} | {
    day: string;
    kind: string;
    observedAt: string;
}, truthOpts?: TruthGetOptions) => Promise<ApiResult<LineageResponseDto>>;
/**
 * Phase 1.5 Sprint 2 — Health Score (derived truth, server-computed only).
 * GET /users/me/health-score?day=YYYY-MM-DD
 */
export declare const getHealthScore: (day: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<HealthScoreDoc>>;
/**
 * Phase 1.5 Sprint 4 — Health Signals (derived truth, server-computed only).
 * GET /users/me/health-signals?day=YYYY-MM-DD
 */
export declare const getHealthSignals: (day: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<HealthSignalDoc>>;
/**
 * Truth surface for UI readiness gating.
 */
export declare const getDayTruth: (day: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<DayTruthDto>>;
export declare const getLabResults: (idToken: string, opts?: {
    limit?: number;
} & TruthGetOptions) => Promise<ApiResult<LabResultsListResponseDto>>;
export declare const getLabResult: (id: string, idToken: string, opts?: TruthGetOptions) => Promise<ApiResult<LabResultDto>>;
export declare const createLabResult: (payload: CreateLabResultRequestDto, idToken: string, idempotencyKey: string) => Promise<ApiResult<CreateLabResultResponseDto>>;
export {};
//# sourceMappingURL=usersMe.d.ts.map