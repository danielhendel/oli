import { z } from "zod";
export declare const ymdDateStringSchema: z.ZodString;
export declare const isoDateTimeStringSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const rawEventSchemaVersionSchema: z.ZodLiteral<1>;
/**
 * Phase 2 — Uncertainty state at event level.
 * Must be visible at event/day/timeline. Never silently upgraded.
 */
export declare const uncertaintyStateSchema: z.ZodEnum<["complete", "incomplete", "uncertain"]>;
export type UncertaintyState = z.infer<typeof uncertaintyStateSchema>;
/**
 * Phase 2 — Provenance/source of the event.
 * Backfill = logged after the fact; recordedAt differs from occurredAt.
 */
export declare const provenanceSchema: z.ZodEnum<["manual", "device", "upload", "backfill", "correction"]>;
export type Provenance = z.infer<typeof provenanceSchema>;
/**
 * Phase 2 — occurredAt: exact ISO datetime OR time window/range.
 * Never fake precision. Approximate time remains visible as approximate.
 */
export declare const occurredAtExactSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const occurredAtRangeSchema: z.ZodEffects<z.ZodObject<{
    start: z.ZodEffects<z.ZodString, string, string>;
    end: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
}, {
    start: string;
    end: string;
}>, {
    start: string;
    end: string;
}, {
    start: string;
    end: string;
}>;
export declare const occurredAtSchema: z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodEffects<z.ZodObject<{
    start: z.ZodEffects<z.ZodString, string, string>;
    end: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
}, {
    start: string;
    end: string;
}>, {
    start: string;
    end: string;
}, {
    start: string;
    end: string;
}>]>;
export type OccurredAt = z.infer<typeof occurredAtSchema>;
/**
 * Phase 2 — recordedAt: exact ISO datetime when the event was logged.
 * For backfill: recordedAt = now, occurredAt = past.
 */
export declare const recordedAtSchema: z.ZodEffects<z.ZodString, string, string>;
/**
 * RawEvent kinds are the ingestion boundary taxonomy.
 *
 * Phase 1 rule:
 * - Canonical kinds exist here (sleep/steps/...)
 * - "file" is memory-only (upload artifact), not canonical, not normalized yet.
 *
 * Phase 2:
 * - "incomplete" is memory-only: "something happened, details later".
 */
export declare const rawEventKindSchema: z.ZodEnum<["sleep", "steps", "workout", "weight", "hrv", "nutrition", "strength_workout", "file", "incomplete"]>;
/**
 * POST /ingest accepted response (shared by weight, strength_workout, etc.)
 */
export declare const ingestAcceptedResponseDtoSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    rawEventId: z.ZodString;
    day: z.ZodOptional<z.ZodString>;
    idempotentReplay: z.ZodOptional<z.ZodLiteral<true>>;
}, "strip", z.ZodTypeAny, {
    ok: true;
    rawEventId: string;
    day?: string | undefined;
    idempotentReplay?: true | undefined;
}, {
    ok: true;
    rawEventId: string;
    day?: string | undefined;
    idempotentReplay?: true | undefined;
}>;
export type IngestAcceptedResponseDto = z.infer<typeof ingestAcceptedResponseDtoSchema>;
declare const manualSleepPayloadSchema: z.ZodObject<{
    start: z.ZodEffects<z.ZodString, string, string>;
    end: z.ZodEffects<z.ZodString, string, string>;
    timezone: z.ZodString;
    day: z.ZodOptional<z.ZodString>;
} & {
    totalMinutes: z.ZodNumber;
    efficiency: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    latencyMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    awakenings: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    isMainSleep: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
    timezone: string;
    totalMinutes: number;
    isMainSleep: boolean;
    day?: string | undefined;
    efficiency?: number | null | undefined;
    latencyMinutes?: number | null | undefined;
    awakenings?: number | null | undefined;
}, {
    start: string;
    end: string;
    timezone: string;
    totalMinutes: number;
    isMainSleep: boolean;
    day?: string | undefined;
    efficiency?: number | null | undefined;
    latencyMinutes?: number | null | undefined;
    awakenings?: number | null | undefined;
}>;
declare const manualStepsPayloadSchema: z.ZodObject<{
    start: z.ZodEffects<z.ZodString, string, string>;
    end: z.ZodEffects<z.ZodString, string, string>;
    timezone: z.ZodString;
    day: z.ZodOptional<z.ZodString>;
} & {
    steps: z.ZodNumber;
    distanceKm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    moveMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
    steps: number;
    timezone: string;
    day?: string | undefined;
    distanceKm?: number | null | undefined;
    moveMinutes?: number | null | undefined;
}, {
    start: string;
    end: string;
    steps: number;
    timezone: string;
    day?: string | undefined;
    distanceKm?: number | null | undefined;
    moveMinutes?: number | null | undefined;
}>;
declare const manualWorkoutPayloadSchema: z.ZodObject<{
    start: z.ZodEffects<z.ZodString, string, string>;
    end: z.ZodEffects<z.ZodString, string, string>;
    timezone: z.ZodString;
    day: z.ZodOptional<z.ZodString>;
} & {
    sport: z.ZodString;
    intensity: z.ZodOptional<z.ZodEnum<["easy", "moderate", "hard"]>>;
    durationMinutes: z.ZodNumber;
    trainingLoad: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
    timezone: string;
    sport: string;
    durationMinutes: number;
    day?: string | undefined;
    intensity?: "easy" | "moderate" | "hard" | undefined;
    trainingLoad?: number | null | undefined;
}, {
    start: string;
    end: string;
    timezone: string;
    sport: string;
    durationMinutes: number;
    day?: string | undefined;
    intensity?: "easy" | "moderate" | "hard" | undefined;
    trainingLoad?: number | null | undefined;
}>;
declare const manualWeightPayloadSchema: z.ZodObject<{
    time: z.ZodEffects<z.ZodString, string, string>;
    timezone: z.ZodString;
    day: z.ZodOptional<z.ZodString>;
    weightKg: z.ZodNumber;
    bodyFatPercent: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    timezone: string;
    time: string;
    weightKg: number;
    bodyFatPercent?: number | null | undefined;
    day?: string | undefined;
}, {
    timezone: string;
    time: string;
    weightKg: number;
    bodyFatPercent?: number | null | undefined;
    day?: string | undefined;
}>;
declare const manualHrvPayloadSchema: z.ZodObject<{
    time: z.ZodEffects<z.ZodString, string, string>;
    timezone: z.ZodString;
    day: z.ZodOptional<z.ZodString>;
    rmssdMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    sdnnMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    measurementType: z.ZodOptional<z.ZodEnum<["nightly", "spot"]>>;
}, "strip", z.ZodTypeAny, {
    timezone: string;
    time: string;
    day?: string | undefined;
    rmssdMs?: number | null | undefined;
    sdnnMs?: number | null | undefined;
    measurementType?: "nightly" | "spot" | undefined;
}, {
    timezone: string;
    time: string;
    day?: string | undefined;
    rmssdMs?: number | null | undefined;
    sdnnMs?: number | null | undefined;
    measurementType?: "nightly" | "spot" | undefined;
}>;
declare const manualNutritionPayloadSchema: z.ZodObject<{
    start: z.ZodEffects<z.ZodString, string, string>;
    end: z.ZodEffects<z.ZodString, string, string>;
    timezone: z.ZodString;
    day: z.ZodOptional<z.ZodString>;
} & {
    totalKcal: z.ZodNumber;
    proteinG: z.ZodNumber;
    carbsG: z.ZodNumber;
    fatG: z.ZodNumber;
    fiberG: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
    timezone: string;
    totalKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    day?: string | undefined;
    fiberG?: number | null | undefined;
}, {
    start: string;
    end: string;
    timezone: string;
    totalKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    day?: string | undefined;
    fiberG?: number | null | undefined;
}>;
declare const manualStrengthWorkoutPayloadSchema: z.ZodObject<{
    startedAt: z.ZodEffects<z.ZodString, string, string>;
    timeZone: z.ZodString;
    exercises: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        sets: z.ZodArray<z.ZodEffects<z.ZodObject<{
            reps: z.ZodNumber;
            load: z.ZodNumber;
            unit: z.ZodEnum<["lb", "kg"]>;
            isWarmup: z.ZodOptional<z.ZodBoolean>;
            rpe: z.ZodOptional<z.ZodNumber>;
            rir: z.ZodOptional<z.ZodNumber>;
            notes: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            reps: number;
            load: number;
            unit: "lb" | "kg";
            isWarmup?: boolean | undefined;
            rpe?: number | undefined;
            rir?: number | undefined;
            notes?: string | undefined;
        }, {
            reps: number;
            load: number;
            unit: "lb" | "kg";
            isWarmup?: boolean | undefined;
            rpe?: number | undefined;
            rir?: number | undefined;
            notes?: string | undefined;
        }>, {
            reps: number;
            load: number;
            unit: "lb" | "kg";
            isWarmup?: boolean | undefined;
            rpe?: number | undefined;
            rir?: number | undefined;
            notes?: string | undefined;
        }, {
            reps: number;
            load: number;
            unit: "lb" | "kg";
            isWarmup?: boolean | undefined;
            rpe?: number | undefined;
            rir?: number | undefined;
            notes?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        sets: {
            reps: number;
            load: number;
            unit: "lb" | "kg";
            isWarmup?: boolean | undefined;
            rpe?: number | undefined;
            rir?: number | undefined;
            notes?: string | undefined;
        }[];
    }, {
        name: string;
        sets: {
            reps: number;
            load: number;
            unit: "lb" | "kg";
            isWarmup?: boolean | undefined;
            rpe?: number | undefined;
            rir?: number | undefined;
            notes?: string | undefined;
        }[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    startedAt: string;
    timeZone: string;
    exercises: {
        name: string;
        sets: {
            reps: number;
            load: number;
            unit: "lb" | "kg";
            isWarmup?: boolean | undefined;
            rpe?: number | undefined;
            rir?: number | undefined;
            notes?: string | undefined;
        }[];
    }[];
}, {
    startedAt: string;
    timeZone: string;
    exercises: {
        name: string;
        sets: {
            reps: number;
            load: number;
            unit: "lb" | "kg";
            isWarmup?: boolean | undefined;
            rpe?: number | undefined;
            rir?: number | undefined;
            notes?: string | undefined;
        }[];
    }[];
}>;
/**
 * Phase 1: file upload artifact (NO parsing)
 *
 * Required properties:
 * - storageBucket + storagePath: verifiable reference to stored bytes
 * - sha256 + sizeBytes: integrity + replay/debug
 * - mimeType + originalFilename: user meaning + future parsing
 */
declare const manualFilePayloadSchema: z.ZodObject<{
    storageBucket: z.ZodString;
    storagePath: z.ZodString;
    sha256: z.ZodString;
    sizeBytes: z.ZodNumber;
    mimeType: z.ZodString;
    originalFilename: z.ZodString;
}, "strip", z.ZodTypeAny, {
    storageBucket: string;
    storagePath: string;
    sha256: string;
    sizeBytes: number;
    mimeType: string;
    originalFilename: string;
}, {
    storageBucket: string;
    storagePath: string;
    sha256: string;
    sizeBytes: number;
    mimeType: string;
    originalFilename: string;
}>;
/**
 * Phase 2 — Incomplete event payload.
 * "Something happened" — minimal friction, no forced guessing.
 */
declare const manualIncompletePayloadSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
declare const rawEventBaseSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    userId: z.ZodString;
    sourceId: z.ZodString;
    provider: z.ZodString;
    sourceType: z.ZodString;
    kind: z.ZodEnum<["sleep", "steps", "workout", "weight", "hrv", "nutrition", "strength_workout", "file", "incomplete"]>;
    receivedAt: z.ZodEffects<z.ZodString, string, string>;
    observedAt: z.ZodEffects<z.ZodString, string, string>;
    payload: z.ZodUnknown;
    recordedAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    occurredAt: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodEffects<z.ZodObject<{
        start: z.ZodEffects<z.ZodString, string, string>;
        end: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>]>>;
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
    provider: string;
    sourceType: string;
    receivedAt: string;
    observedAt: string;
    payload?: unknown;
    recordedAt?: string | undefined;
    occurredAt?: string | {
        start: string;
        end: string;
    } | undefined;
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
    provider: string;
    sourceType: string;
    receivedAt: string;
    observedAt: string;
    payload?: unknown;
    recordedAt?: string | undefined;
    occurredAt?: string | {
        start: string;
        end: string;
    } | undefined;
    provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
    uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
    contentUnknown?: boolean | undefined;
    correctionOfRawEventId?: string | undefined;
}>;
/**
 * Authoritative RawEvent Firestore document schema.
 *
 * - Validates root metadata
 * - Validates payload shape based on `kind`
 * - Keeps provider/sourceType flexible for future integrations
 */
export declare const rawEventDocSchema: z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    userId: z.ZodString;
    sourceId: z.ZodString;
    provider: z.ZodString;
    sourceType: z.ZodString;
    kind: z.ZodEnum<["sleep", "steps", "workout", "weight", "hrv", "nutrition", "strength_workout", "file", "incomplete"]>;
    receivedAt: z.ZodEffects<z.ZodString, string, string>;
    observedAt: z.ZodEffects<z.ZodString, string, string>;
    payload: z.ZodUnknown;
    recordedAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    occurredAt: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodEffects<z.ZodObject<{
        start: z.ZodEffects<z.ZodString, string, string>;
        end: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>]>>;
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
    provider: string;
    sourceType: string;
    receivedAt: string;
    observedAt: string;
    payload?: unknown;
    recordedAt?: string | undefined;
    occurredAt?: string | {
        start: string;
        end: string;
    } | undefined;
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
    provider: string;
    sourceType: string;
    receivedAt: string;
    observedAt: string;
    payload?: unknown;
    recordedAt?: string | undefined;
    occurredAt?: string | {
        start: string;
        end: string;
    } | undefined;
    provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
    uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
    contentUnknown?: boolean | undefined;
    correctionOfRawEventId?: string | undefined;
}>, {
    kind: "incomplete" | "sleep" | "steps" | "workout" | "weight" | "hrv" | "nutrition" | "strength_workout" | "file";
    schemaVersion: 1;
    id: string;
    userId: string;
    sourceId: string;
    provider: string;
    sourceType: string;
    receivedAt: string;
    observedAt: string;
    payload?: unknown;
    recordedAt?: string | undefined;
    occurredAt?: string | {
        start: string;
        end: string;
    } | undefined;
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
    provider: string;
    sourceType: string;
    receivedAt: string;
    observedAt: string;
    payload?: unknown;
    recordedAt?: string | undefined;
    occurredAt?: string | {
        start: string;
        end: string;
    } | undefined;
    provenance?: "manual" | "device" | "upload" | "backfill" | "correction" | undefined;
    uncertaintyState?: "complete" | "incomplete" | "uncertain" | undefined;
    contentUnknown?: boolean | undefined;
    correctionOfRawEventId?: string | undefined;
}>;
export type RawEventDoc = z.infer<typeof rawEventBaseSchema> & {
    payload: z.infer<typeof manualSleepPayloadSchema> | z.infer<typeof manualStepsPayloadSchema> | z.infer<typeof manualWorkoutPayloadSchema> | z.infer<typeof manualWeightPayloadSchema> | z.infer<typeof manualHrvPayloadSchema> | z.infer<typeof manualNutritionPayloadSchema> | z.infer<typeof manualStrengthWorkoutPayloadSchema> | z.infer<typeof manualFilePayloadSchema> | z.infer<typeof manualIncompletePayloadSchema>;
};
/**
 * Secondary export: payload schemas keyed by canonical kind.
 * This avoids naming collisions with other contract modules.
 */
export declare const rawEventPayloadByKindSchemas: {
    readonly sleep: z.ZodObject<{
        start: z.ZodEffects<z.ZodString, string, string>;
        end: z.ZodEffects<z.ZodString, string, string>;
        timezone: z.ZodString;
        day: z.ZodOptional<z.ZodString>;
    } & {
        totalMinutes: z.ZodNumber;
        efficiency: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        latencyMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        awakenings: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        isMainSleep: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
        timezone: string;
        totalMinutes: number;
        isMainSleep: boolean;
        day?: string | undefined;
        efficiency?: number | null | undefined;
        latencyMinutes?: number | null | undefined;
        awakenings?: number | null | undefined;
    }, {
        start: string;
        end: string;
        timezone: string;
        totalMinutes: number;
        isMainSleep: boolean;
        day?: string | undefined;
        efficiency?: number | null | undefined;
        latencyMinutes?: number | null | undefined;
        awakenings?: number | null | undefined;
    }>;
    readonly steps: z.ZodObject<{
        start: z.ZodEffects<z.ZodString, string, string>;
        end: z.ZodEffects<z.ZodString, string, string>;
        timezone: z.ZodString;
        day: z.ZodOptional<z.ZodString>;
    } & {
        steps: z.ZodNumber;
        distanceKm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        moveMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
        steps: number;
        timezone: string;
        day?: string | undefined;
        distanceKm?: number | null | undefined;
        moveMinutes?: number | null | undefined;
    }, {
        start: string;
        end: string;
        steps: number;
        timezone: string;
        day?: string | undefined;
        distanceKm?: number | null | undefined;
        moveMinutes?: number | null | undefined;
    }>;
    readonly workout: z.ZodObject<{
        start: z.ZodEffects<z.ZodString, string, string>;
        end: z.ZodEffects<z.ZodString, string, string>;
        timezone: z.ZodString;
        day: z.ZodOptional<z.ZodString>;
    } & {
        sport: z.ZodString;
        intensity: z.ZodOptional<z.ZodEnum<["easy", "moderate", "hard"]>>;
        durationMinutes: z.ZodNumber;
        trainingLoad: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
        timezone: string;
        sport: string;
        durationMinutes: number;
        day?: string | undefined;
        intensity?: "easy" | "moderate" | "hard" | undefined;
        trainingLoad?: number | null | undefined;
    }, {
        start: string;
        end: string;
        timezone: string;
        sport: string;
        durationMinutes: number;
        day?: string | undefined;
        intensity?: "easy" | "moderate" | "hard" | undefined;
        trainingLoad?: number | null | undefined;
    }>;
    readonly weight: z.ZodObject<{
        time: z.ZodEffects<z.ZodString, string, string>;
        timezone: z.ZodString;
        day: z.ZodOptional<z.ZodString>;
        weightKg: z.ZodNumber;
        bodyFatPercent: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        timezone: string;
        time: string;
        weightKg: number;
        bodyFatPercent?: number | null | undefined;
        day?: string | undefined;
    }, {
        timezone: string;
        time: string;
        weightKg: number;
        bodyFatPercent?: number | null | undefined;
        day?: string | undefined;
    }>;
    readonly hrv: z.ZodObject<{
        time: z.ZodEffects<z.ZodString, string, string>;
        timezone: z.ZodString;
        day: z.ZodOptional<z.ZodString>;
        rmssdMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        sdnnMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        measurementType: z.ZodOptional<z.ZodEnum<["nightly", "spot"]>>;
    }, "strip", z.ZodTypeAny, {
        timezone: string;
        time: string;
        day?: string | undefined;
        rmssdMs?: number | null | undefined;
        sdnnMs?: number | null | undefined;
        measurementType?: "nightly" | "spot" | undefined;
    }, {
        timezone: string;
        time: string;
        day?: string | undefined;
        rmssdMs?: number | null | undefined;
        sdnnMs?: number | null | undefined;
        measurementType?: "nightly" | "spot" | undefined;
    }>;
    readonly nutrition: z.ZodObject<{
        start: z.ZodEffects<z.ZodString, string, string>;
        end: z.ZodEffects<z.ZodString, string, string>;
        timezone: z.ZodString;
        day: z.ZodOptional<z.ZodString>;
    } & {
        totalKcal: z.ZodNumber;
        proteinG: z.ZodNumber;
        carbsG: z.ZodNumber;
        fatG: z.ZodNumber;
        fiberG: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
        timezone: string;
        totalKcal: number;
        proteinG: number;
        carbsG: number;
        fatG: number;
        day?: string | undefined;
        fiberG?: number | null | undefined;
    }, {
        start: string;
        end: string;
        timezone: string;
        totalKcal: number;
        proteinG: number;
        carbsG: number;
        fatG: number;
        day?: string | undefined;
        fiberG?: number | null | undefined;
    }>;
    readonly strength_workout: z.ZodObject<{
        startedAt: z.ZodEffects<z.ZodString, string, string>;
        timeZone: z.ZodString;
        exercises: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            sets: z.ZodArray<z.ZodEffects<z.ZodObject<{
                reps: z.ZodNumber;
                load: z.ZodNumber;
                unit: z.ZodEnum<["lb", "kg"]>;
                isWarmup: z.ZodOptional<z.ZodBoolean>;
                rpe: z.ZodOptional<z.ZodNumber>;
                rir: z.ZodOptional<z.ZodNumber>;
                notes: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                reps: number;
                load: number;
                unit: "lb" | "kg";
                isWarmup?: boolean | undefined;
                rpe?: number | undefined;
                rir?: number | undefined;
                notes?: string | undefined;
            }, {
                reps: number;
                load: number;
                unit: "lb" | "kg";
                isWarmup?: boolean | undefined;
                rpe?: number | undefined;
                rir?: number | undefined;
                notes?: string | undefined;
            }>, {
                reps: number;
                load: number;
                unit: "lb" | "kg";
                isWarmup?: boolean | undefined;
                rpe?: number | undefined;
                rir?: number | undefined;
                notes?: string | undefined;
            }, {
                reps: number;
                load: number;
                unit: "lb" | "kg";
                isWarmup?: boolean | undefined;
                rpe?: number | undefined;
                rir?: number | undefined;
                notes?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            name: string;
            sets: {
                reps: number;
                load: number;
                unit: "lb" | "kg";
                isWarmup?: boolean | undefined;
                rpe?: number | undefined;
                rir?: number | undefined;
                notes?: string | undefined;
            }[];
        }, {
            name: string;
            sets: {
                reps: number;
                load: number;
                unit: "lb" | "kg";
                isWarmup?: boolean | undefined;
                rpe?: number | undefined;
                rir?: number | undefined;
                notes?: string | undefined;
            }[];
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        startedAt: string;
        timeZone: string;
        exercises: {
            name: string;
            sets: {
                reps: number;
                load: number;
                unit: "lb" | "kg";
                isWarmup?: boolean | undefined;
                rpe?: number | undefined;
                rir?: number | undefined;
                notes?: string | undefined;
            }[];
        }[];
    }, {
        startedAt: string;
        timeZone: string;
        exercises: {
            name: string;
            sets: {
                reps: number;
                load: number;
                unit: "lb" | "kg";
                isWarmup?: boolean | undefined;
                rpe?: number | undefined;
                rir?: number | undefined;
                notes?: string | undefined;
            }[];
        }[];
    }>;
    readonly file: z.ZodObject<{
        storageBucket: z.ZodString;
        storagePath: z.ZodString;
        sha256: z.ZodString;
        sizeBytes: z.ZodNumber;
        mimeType: z.ZodString;
        originalFilename: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        storageBucket: string;
        storagePath: string;
        sha256: string;
        sizeBytes: number;
        mimeType: string;
        originalFilename: string;
    }, {
        storageBucket: string;
        storagePath: string;
        sha256: string;
        sizeBytes: number;
        mimeType: string;
        originalFilename: string;
    }>;
    readonly incomplete: z.ZodObject<{
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        note?: string | undefined;
    }, {
        note?: string | undefined;
    }>;
};
export {};
//# sourceMappingURL=rawEvent.d.ts.map