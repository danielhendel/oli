/**
 * Sprint 1 — Retrieval Surfaces (Library Backbone)
 *
 * Zod schemas for list/query endpoints:
 * - GET /users/me/raw-events
 * - GET /users/me/events
 * - GET /users/me/timeline
 * - GET /users/me/lineage
 */
import { z } from "zod";
export declare const rawEventListItemSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    sourceId: z.ZodString;
    kind: z.ZodEnum<["sleep", "steps", "workout", "weight", "hrv", "nutrition", "strength_workout", "file", "incomplete"]>;
    observedAt: z.ZodEffects<z.ZodString, string, string>;
    receivedAt: z.ZodEffects<z.ZodString, string, string>;
    schemaVersion: z.ZodLiteral<1>;
    recordedAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    provenance: z.ZodOptional<z.ZodEnum<["manual", "device", "upload", "backfill", "correction"]>>;
    uncertaintyState: z.ZodOptional<z.ZodEnum<["complete", "incomplete", "uncertain"]>>;
    contentUnknown: z.ZodOptional<z.ZodBoolean>;
    correctionOfRawEventId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "incomplete" | "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout" | "file";
    schemaVersion: 1;
    id: string;
    userId: string;
    sourceId: string;
    receivedAt: string;
    observedAt: string;
    recordedAt?: string | undefined;
    provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
    uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
    contentUnknown?: boolean | undefined;
    correctionOfRawEventId?: string | undefined;
}, {
    kind: "incomplete" | "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout" | "file";
    schemaVersion: 1;
    id: string;
    userId: string;
    sourceId: string;
    receivedAt: string;
    observedAt: string;
    recordedAt?: string | undefined;
    provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
    uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
    contentUnknown?: boolean | undefined;
    correctionOfRawEventId?: string | undefined;
}>;
export type RawEventListItem = z.infer<typeof rawEventListItemSchema>;
export declare const rawEventsListResponseDtoSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        sourceId: z.ZodString;
        kind: z.ZodEnum<["sleep", "steps", "workout", "weight", "hrv", "nutrition", "strength_workout", "file", "incomplete"]>;
        observedAt: z.ZodEffects<z.ZodString, string, string>;
        receivedAt: z.ZodEffects<z.ZodString, string, string>;
        schemaVersion: z.ZodLiteral<1>;
        recordedAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        provenance: z.ZodOptional<z.ZodEnum<["manual", "device", "upload", "backfill", "correction"]>>;
        uncertaintyState: z.ZodOptional<z.ZodEnum<["complete", "incomplete", "uncertain"]>>;
        contentUnknown: z.ZodOptional<z.ZodBoolean>;
        correctionOfRawEventId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        kind: "incomplete" | "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout" | "file";
        schemaVersion: 1;
        id: string;
        userId: string;
        sourceId: string;
        receivedAt: string;
        observedAt: string;
        recordedAt?: string | undefined;
        provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
        uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
        contentUnknown?: boolean | undefined;
        correctionOfRawEventId?: string | undefined;
    }, {
        kind: "incomplete" | "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout" | "file";
        schemaVersion: 1;
        id: string;
        userId: string;
        sourceId: string;
        receivedAt: string;
        observedAt: string;
        recordedAt?: string | undefined;
        provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
        uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
        contentUnknown?: boolean | undefined;
        correctionOfRawEventId?: string | undefined;
    }>, "many">;
    nextCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        kind: "incomplete" | "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout" | "file";
        schemaVersion: 1;
        id: string;
        userId: string;
        sourceId: string;
        receivedAt: string;
        observedAt: string;
        recordedAt?: string | undefined;
        provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
        uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
        contentUnknown?: boolean | undefined;
        correctionOfRawEventId?: string | undefined;
    }[];
    nextCursor: string | null;
}, {
    items: {
        kind: "incomplete" | "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout" | "file";
        schemaVersion: 1;
        id: string;
        userId: string;
        sourceId: string;
        receivedAt: string;
        observedAt: string;
        recordedAt?: string | undefined;
        provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
        uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
        contentUnknown?: boolean | undefined;
        correctionOfRawEventId?: string | undefined;
    }[];
    nextCursor: string | null;
}>;
export type RawEventsListResponseDto = z.infer<typeof rawEventsListResponseDtoSchema>;
export declare const canonicalEventKindSchema: z.ZodEnum<["sleep", "steps", "workout", "weight", "hrv", "nutrition", "strength_workout"]>;
export declare const canonicalEventListItemSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    sourceId: z.ZodString;
    kind: z.ZodEnum<["sleep", "steps", "workout", "weight", "hrv", "nutrition", "strength_workout"]>;
    start: z.ZodEffects<z.ZodString, string, string>;
    end: z.ZodEffects<z.ZodString, string, string>;
    day: z.ZodString;
    timezone: z.ZodString;
    createdAt: z.ZodEffects<z.ZodString, string, string>;
    updatedAt: z.ZodEffects<z.ZodString, string, string>;
    schemaVersion: z.ZodLiteral<1>;
}, "strip", z.ZodTypeAny, {
    kind: "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout";
    day: string;
    start: string;
    end: string;
    timezone: string;
    schemaVersion: 1;
    id: string;
    userId: string;
    sourceId: string;
    createdAt: string;
    updatedAt: string;
}, {
    kind: "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout";
    day: string;
    start: string;
    end: string;
    timezone: string;
    schemaVersion: 1;
    id: string;
    userId: string;
    sourceId: string;
    createdAt: string;
    updatedAt: string;
}>;
export type CanonicalEventListItem = z.infer<typeof canonicalEventListItemSchema>;
export declare const canonicalEventsListResponseDtoSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        sourceId: z.ZodString;
        kind: z.ZodEnum<["sleep", "steps", "workout", "weight", "hrv", "nutrition", "strength_workout"]>;
        start: z.ZodEffects<z.ZodString, string, string>;
        end: z.ZodEffects<z.ZodString, string, string>;
        day: z.ZodString;
        timezone: z.ZodString;
        createdAt: z.ZodEffects<z.ZodString, string, string>;
        updatedAt: z.ZodEffects<z.ZodString, string, string>;
        schemaVersion: z.ZodLiteral<1>;
    }, "strip", z.ZodTypeAny, {
        kind: "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout";
        day: string;
        start: string;
        end: string;
        timezone: string;
        schemaVersion: 1;
        id: string;
        userId: string;
        sourceId: string;
        createdAt: string;
        updatedAt: string;
    }, {
        kind: "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout";
        day: string;
        start: string;
        end: string;
        timezone: string;
        schemaVersion: 1;
        id: string;
        userId: string;
        sourceId: string;
        createdAt: string;
        updatedAt: string;
    }>, "many">;
    nextCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        kind: "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout";
        day: string;
        start: string;
        end: string;
        timezone: string;
        schemaVersion: 1;
        id: string;
        userId: string;
        sourceId: string;
        createdAt: string;
        updatedAt: string;
    }[];
    nextCursor: string | null;
}, {
    items: {
        kind: "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout";
        day: string;
        start: string;
        end: string;
        timezone: string;
        schemaVersion: 1;
        id: string;
        userId: string;
        sourceId: string;
        createdAt: string;
        updatedAt: string;
    }[];
    nextCursor: string | null;
}>;
export type CanonicalEventsListResponseDto = z.infer<typeof canonicalEventsListResponseDtoSchema>;
/** Phase 2 — Day completeness state for truth visibility */
export declare const dayCompletenessStateSchema: z.ZodEnum<["complete", "partial", "incomplete", "empty"]>;
export type DayCompletenessState = z.infer<typeof dayCompletenessStateSchema>;
/** Phase 2 — Rollup of uncertainty states present in the day (complete | incomplete | uncertain) */
export declare const uncertaintyStateRollupSchema: z.ZodObject<{
    hasComplete: z.ZodOptional<z.ZodBoolean>;
    hasIncomplete: z.ZodOptional<z.ZodBoolean>;
    hasUncertain: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    hasComplete?: boolean | undefined;
    hasIncomplete?: boolean | undefined;
    hasUncertain?: boolean | undefined;
}, {
    hasComplete?: boolean | undefined;
    hasIncomplete?: boolean | undefined;
    hasUncertain?: boolean | undefined;
}>;
export type UncertaintyStateRollup = z.infer<typeof uncertaintyStateRollupSchema>;
/**
 * Sprint 3 — Deterministic missing reasons ("what's missing") for completeness explanation.
 * Human-readable strings, deterministic ordering, computed on server.
 */
export declare const missingReasonsSchema: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
export type MissingReasons = z.infer<typeof missingReasonsSchema>;
export declare const timelineDaySchema: z.ZodObject<{
    day: z.ZodString;
    canonicalCount: z.ZodNumber;
    hasDailyFacts: z.ZodBoolean;
    hasInsights: z.ZodBoolean;
    hasIntelligenceContext: z.ZodBoolean;
    hasDerivedLedger: z.ZodBoolean;
    incompleteCount: z.ZodOptional<z.ZodNumber>;
    hasIncompleteEvents: z.ZodOptional<z.ZodBoolean>;
    dayCompletenessState: z.ZodOptional<z.ZodEnum<["complete", "partial", "incomplete", "empty"]>>;
    uncertaintyStateRollup: z.ZodOptional<z.ZodObject<{
        hasComplete: z.ZodOptional<z.ZodBoolean>;
        hasIncomplete: z.ZodOptional<z.ZodBoolean>;
        hasUncertain: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        hasComplete?: boolean | undefined;
        hasIncomplete?: boolean | undefined;
        hasUncertain?: boolean | undefined;
    }, {
        hasComplete?: boolean | undefined;
        hasIncomplete?: boolean | undefined;
        hasUncertain?: boolean | undefined;
    }>>;
    missingReasons: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    day: string;
    hasDailyFacts: boolean;
    hasInsights: boolean;
    hasIntelligenceContext: boolean;
    canonicalCount: number;
    hasDerivedLedger: boolean;
    incompleteCount?: number | undefined;
    hasIncompleteEvents?: boolean | undefined;
    dayCompletenessState?: "complete" | "incomplete" | "partial" | "empty" | undefined;
    uncertaintyStateRollup?: {
        hasComplete?: boolean | undefined;
        hasIncomplete?: boolean | undefined;
        hasUncertain?: boolean | undefined;
    } | undefined;
    missingReasons?: string[] | undefined;
}, {
    day: string;
    hasDailyFacts: boolean;
    hasInsights: boolean;
    hasIntelligenceContext: boolean;
    canonicalCount: number;
    hasDerivedLedger: boolean;
    incompleteCount?: number | undefined;
    hasIncompleteEvents?: boolean | undefined;
    dayCompletenessState?: "complete" | "incomplete" | "partial" | "empty" | undefined;
    uncertaintyStateRollup?: {
        hasComplete?: boolean | undefined;
        hasIncomplete?: boolean | undefined;
        hasUncertain?: boolean | undefined;
    } | undefined;
    missingReasons?: string[] | undefined;
}>;
export type TimelineDay = z.infer<typeof timelineDaySchema>;
export declare const timelineResponseDtoSchema: z.ZodObject<{
    days: z.ZodArray<z.ZodObject<{
        day: z.ZodString;
        canonicalCount: z.ZodNumber;
        hasDailyFacts: z.ZodBoolean;
        hasInsights: z.ZodBoolean;
        hasIntelligenceContext: z.ZodBoolean;
        hasDerivedLedger: z.ZodBoolean;
        incompleteCount: z.ZodOptional<z.ZodNumber>;
        hasIncompleteEvents: z.ZodOptional<z.ZodBoolean>;
        dayCompletenessState: z.ZodOptional<z.ZodEnum<["complete", "partial", "incomplete", "empty"]>>;
        uncertaintyStateRollup: z.ZodOptional<z.ZodObject<{
            hasComplete: z.ZodOptional<z.ZodBoolean>;
            hasIncomplete: z.ZodOptional<z.ZodBoolean>;
            hasUncertain: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            hasComplete?: boolean | undefined;
            hasIncomplete?: boolean | undefined;
            hasUncertain?: boolean | undefined;
        }, {
            hasComplete?: boolean | undefined;
            hasIncomplete?: boolean | undefined;
            hasUncertain?: boolean | undefined;
        }>>;
        missingReasons: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        day: string;
        hasDailyFacts: boolean;
        hasInsights: boolean;
        hasIntelligenceContext: boolean;
        canonicalCount: number;
        hasDerivedLedger: boolean;
        incompleteCount?: number | undefined;
        hasIncompleteEvents?: boolean | undefined;
        dayCompletenessState?: "complete" | "incomplete" | "partial" | "empty" | undefined;
        uncertaintyStateRollup?: {
            hasComplete?: boolean | undefined;
            hasIncomplete?: boolean | undefined;
            hasUncertain?: boolean | undefined;
        } | undefined;
        missingReasons?: string[] | undefined;
    }, {
        day: string;
        hasDailyFacts: boolean;
        hasInsights: boolean;
        hasIntelligenceContext: boolean;
        canonicalCount: number;
        hasDerivedLedger: boolean;
        incompleteCount?: number | undefined;
        hasIncompleteEvents?: boolean | undefined;
        dayCompletenessState?: "complete" | "incomplete" | "partial" | "empty" | undefined;
        uncertaintyStateRollup?: {
            hasComplete?: boolean | undefined;
            hasIncomplete?: boolean | undefined;
            hasUncertain?: boolean | undefined;
        } | undefined;
        missingReasons?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    days: {
        day: string;
        hasDailyFacts: boolean;
        hasInsights: boolean;
        hasIntelligenceContext: boolean;
        canonicalCount: number;
        hasDerivedLedger: boolean;
        incompleteCount?: number | undefined;
        hasIncompleteEvents?: boolean | undefined;
        dayCompletenessState?: "complete" | "incomplete" | "partial" | "empty" | undefined;
        uncertaintyStateRollup?: {
            hasComplete?: boolean | undefined;
            hasIncomplete?: boolean | undefined;
            hasUncertain?: boolean | undefined;
        } | undefined;
        missingReasons?: string[] | undefined;
    }[];
}, {
    days: {
        day: string;
        hasDailyFacts: boolean;
        hasInsights: boolean;
        hasIntelligenceContext: boolean;
        canonicalCount: number;
        hasDerivedLedger: boolean;
        incompleteCount?: number | undefined;
        hasIncompleteEvents?: boolean | undefined;
        dayCompletenessState?: "complete" | "incomplete" | "partial" | "empty" | undefined;
        uncertaintyStateRollup?: {
            hasComplete?: boolean | undefined;
            hasIncomplete?: boolean | undefined;
            hasUncertain?: boolean | undefined;
        } | undefined;
        missingReasons?: string[] | undefined;
    }[];
}>;
export type TimelineResponseDto = z.infer<typeof timelineResponseDtoSchema>;
export declare const lineageResponseDtoSchema: z.ZodObject<{
    rawEventIds: z.ZodArray<z.ZodString, "many">;
    canonicalEventId: z.ZodNullable<z.ZodString>;
    derivedLedgerRuns: z.ZodArray<z.ZodObject<{
        day: z.ZodString;
        runId: z.ZodString;
        computedAt: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        day: string;
        computedAt: string;
        runId: string;
    }, {
        day: string;
        computedAt: string;
        runId: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rawEventIds: string[];
    canonicalEventId: string | null;
    derivedLedgerRuns: {
        day: string;
        computedAt: string;
        runId: string;
    }[];
}, {
    rawEventIds: string[];
    canonicalEventId: string | null;
    derivedLedgerRuns: {
        day: string;
        computedAt: string;
        runId: string;
    }[];
}>;
export type LineageResponseDto = z.infer<typeof lineageResponseDtoSchema>;
export declare const rawEventsListQuerySchema: z.ZodObject<{
    start: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    end: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    kinds: z.ZodEffects<z.ZodOptional<z.ZodString>, string[] | undefined, string | undefined>;
    provenance: z.ZodEffects<z.ZodOptional<z.ZodString>, string[] | undefined, string | undefined>;
    uncertaintyState: z.ZodEffects<z.ZodOptional<z.ZodString>, string[] | undefined, string | undefined>;
    q: z.ZodOptional<z.ZodString>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    start?: string | undefined;
    end?: string | undefined;
    provenance?: string[] | undefined;
    uncertaintyState?: string[] | undefined;
    kinds?: string[] | undefined;
    q?: string | undefined;
    cursor?: string | undefined;
}, {
    start?: string | undefined;
    end?: string | undefined;
    provenance?: string | undefined;
    uncertaintyState?: string | undefined;
    kinds?: string | undefined;
    q?: string | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
}>;
export declare const canonicalEventsListQuerySchema: z.ZodObject<{
    start: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    end: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    kinds: z.ZodEffects<z.ZodOptional<z.ZodString>, string[] | undefined, string | undefined>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    start?: string | undefined;
    end?: string | undefined;
    kinds?: string[] | undefined;
    cursor?: string | undefined;
}, {
    start?: string | undefined;
    end?: string | undefined;
    kinds?: string | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
}>;
export declare const timelineQuerySchema: z.ZodObject<{
    start: z.ZodString;
    end: z.ZodString;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
}, {
    start: string;
    end: string;
}>;
export declare const lineageQuerySchema: z.ZodEffects<z.ZodObject<{
    canonicalEventId: z.ZodOptional<z.ZodString>;
    day: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    observedAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    kind?: string | undefined;
    day?: string | undefined;
    observedAt?: string | undefined;
    canonicalEventId?: string | undefined;
}, {
    kind?: string | undefined;
    day?: string | undefined;
    observedAt?: string | undefined;
    canonicalEventId?: string | undefined;
}>, {
    kind?: string | undefined;
    day?: string | undefined;
    observedAt?: string | undefined;
    canonicalEventId?: string | undefined;
}, {
    kind?: string | undefined;
    day?: string | undefined;
    observedAt?: string | undefined;
    canonicalEventId?: string | undefined;
}>;
//# sourceMappingURL=retrieval.d.ts.map