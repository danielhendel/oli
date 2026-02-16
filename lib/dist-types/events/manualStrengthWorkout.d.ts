/**
 * Strength workout payload shape (matches rawEvent manualStrengthWorkoutPayloadSchema).
 */
type StrengthSet = {
    reps: number;
    load: number;
    unit: "lb" | "kg";
    isWarmup?: boolean;
    rpe?: number;
    rir?: number;
    notes?: string;
};
export type ManualStrengthWorkoutPayload = {
    startedAt: string;
    timeZone: string;
    exercises: {
        name: string;
        sets: StrengthSet[];
    }[];
};
export type ManualStrengthWorkoutInput = {
    startedAt: string;
    timeZone: string;
    exercises: {
        name: string;
        sets: StrengthSet[];
    }[];
};
/**
 * Build a normalized payload suitable for ingestion.
 * Ensures deterministic shape for idempotency hashing.
 */
export declare const buildManualStrengthWorkoutPayload: (input: ManualStrengthWorkoutInput) => ManualStrengthWorkoutPayload;
/**
 * Stable, deterministic idempotency key from normalized payload.
 * Uses hash of canonical JSON similar to manualWeight patterns.
 */
export declare const manualStrengthWorkoutIdempotencyKey: (payload: ManualStrengthWorkoutPayload) => string;
export {};
//# sourceMappingURL=manualStrengthWorkout.d.ts.map