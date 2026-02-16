import { z } from "zod";
export declare const dailyFactsDtoSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    userId: z.ZodString;
    date: z.ZodString;
    computedAt: z.ZodString;
    meta: z.ZodOptional<z.ZodObject<{
        computedAt: z.ZodString;
        pipelineVersion: z.ZodNumber;
        source: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        computedAt: string;
        pipelineVersion: number;
        source?: Record<string, unknown> | undefined;
    }, {
        computedAt: string;
        pipelineVersion: number;
        source?: Record<string, unknown> | undefined;
    }>>;
    sleep: z.ZodOptional<z.ZodObject<{
        totalMinutes: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        totalMinutes?: number | undefined;
    }, {
        totalMinutes?: number | undefined;
    }>>;
    activity: z.ZodOptional<z.ZodObject<{
        steps: z.ZodOptional<z.ZodNumber>;
        distanceKm: z.ZodOptional<z.ZodNumber>;
        moveMinutes: z.ZodOptional<z.ZodNumber>;
        trainingLoad: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        steps?: number | undefined;
        distanceKm?: number | undefined;
        moveMinutes?: number | undefined;
        trainingLoad?: number | undefined;
    }, {
        steps?: number | undefined;
        distanceKm?: number | undefined;
        moveMinutes?: number | undefined;
        trainingLoad?: number | undefined;
    }>>;
    recovery: z.ZodOptional<z.ZodObject<{
        hrvRmssd: z.ZodOptional<z.ZodNumber>;
        hrvRmssdBaseline: z.ZodOptional<z.ZodNumber>;
        hrvRmssdDeviation: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        hrvRmssd?: number | undefined;
        hrvRmssdBaseline?: number | undefined;
        hrvRmssdDeviation?: number | undefined;
    }, {
        hrvRmssd?: number | undefined;
        hrvRmssdBaseline?: number | undefined;
        hrvRmssdDeviation?: number | undefined;
    }>>;
    body: z.ZodOptional<z.ZodObject<{
        weightKg: z.ZodOptional<z.ZodNumber>;
        bodyFatPercent: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        bodyFatPercent?: number | undefined;
        weightKg?: number | undefined;
    }, {
        bodyFatPercent?: number | undefined;
        weightKg?: number | undefined;
    }>>;
    nutrition: z.ZodOptional<z.ZodObject<{
        totalKcal: z.ZodOptional<z.ZodNumber>;
        proteinG: z.ZodOptional<z.ZodNumber>;
        carbsG: z.ZodOptional<z.ZodNumber>;
        fatG: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        totalKcal?: number | undefined;
        proteinG?: number | undefined;
        carbsG?: number | undefined;
        fatG?: number | undefined;
    }, {
        totalKcal?: number | undefined;
        proteinG?: number | undefined;
        carbsG?: number | undefined;
        fatG?: number | undefined;
    }>>;
    strength: z.ZodOptional<z.ZodObject<{
        workoutsCount: z.ZodNumber;
        totalSets: z.ZodNumber;
        totalReps: z.ZodNumber;
        totalVolumeByUnit: z.ZodObject<{
            lb: z.ZodOptional<z.ZodNumber>;
            kg: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            lb?: number | undefined;
            kg?: number | undefined;
        }, {
            lb?: number | undefined;
            kg?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        workoutsCount: number;
        totalSets: number;
        totalReps: number;
        totalVolumeByUnit: {
            lb?: number | undefined;
            kg?: number | undefined;
        };
    }, {
        workoutsCount: number;
        totalSets: number;
        totalReps: number;
        totalVolumeByUnit: {
            lb?: number | undefined;
            kg?: number | undefined;
        };
    }>>;
    confidence: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    schemaVersion: 1;
    userId: string;
    computedAt: string;
    sleep?: {
        totalMinutes?: number | undefined;
    } | undefined;
    nutrition?: {
        totalKcal?: number | undefined;
        proteinG?: number | undefined;
        carbsG?: number | undefined;
        fatG?: number | undefined;
    } | undefined;
    meta?: {
        computedAt: string;
        pipelineVersion: number;
        source?: Record<string, unknown> | undefined;
    } | undefined;
    activity?: {
        steps?: number | undefined;
        distanceKm?: number | undefined;
        moveMinutes?: number | undefined;
        trainingLoad?: number | undefined;
    } | undefined;
    recovery?: {
        hrvRmssd?: number | undefined;
        hrvRmssdBaseline?: number | undefined;
        hrvRmssdDeviation?: number | undefined;
    } | undefined;
    body?: {
        bodyFatPercent?: number | undefined;
        weightKg?: number | undefined;
    } | undefined;
    strength?: {
        workoutsCount: number;
        totalSets: number;
        totalReps: number;
        totalVolumeByUnit: {
            lb?: number | undefined;
            kg?: number | undefined;
        };
    } | undefined;
    confidence?: Record<string, number> | undefined;
}, {
    date: string;
    schemaVersion: 1;
    userId: string;
    computedAt: string;
    sleep?: {
        totalMinutes?: number | undefined;
    } | undefined;
    nutrition?: {
        totalKcal?: number | undefined;
        proteinG?: number | undefined;
        carbsG?: number | undefined;
        fatG?: number | undefined;
    } | undefined;
    meta?: {
        computedAt: string;
        pipelineVersion: number;
        source?: Record<string, unknown> | undefined;
    } | undefined;
    activity?: {
        steps?: number | undefined;
        distanceKm?: number | undefined;
        moveMinutes?: number | undefined;
        trainingLoad?: number | undefined;
    } | undefined;
    recovery?: {
        hrvRmssd?: number | undefined;
        hrvRmssdBaseline?: number | undefined;
        hrvRmssdDeviation?: number | undefined;
    } | undefined;
    body?: {
        bodyFatPercent?: number | undefined;
        weightKg?: number | undefined;
    } | undefined;
    strength?: {
        workoutsCount: number;
        totalSets: number;
        totalReps: number;
        totalVolumeByUnit: {
            lb?: number | undefined;
            kg?: number | undefined;
        };
    } | undefined;
    confidence?: Record<string, number> | undefined;
}>;
export type DailyFactsDto = z.infer<typeof dailyFactsDtoSchema>;
//# sourceMappingURL=dailyFacts.d.ts.map