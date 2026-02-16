import { z } from "zod";
export declare const intelligenceContextDtoSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    version: z.ZodString;
    id: z.ZodString;
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
    confidence: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    facts: z.ZodObject<{
        sleepTotalMinutes: z.ZodOptional<z.ZodNumber>;
        steps: z.ZodOptional<z.ZodNumber>;
        trainingLoad: z.ZodOptional<z.ZodNumber>;
        hrvRmssd: z.ZodOptional<z.ZodNumber>;
        hrvRmssdBaseline: z.ZodOptional<z.ZodNumber>;
        hrvRmssdDeviation: z.ZodOptional<z.ZodNumber>;
        weightKg: z.ZodOptional<z.ZodNumber>;
        bodyFatPercent: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        bodyFatPercent?: number | undefined;
        steps?: number | undefined;
        trainingLoad?: number | undefined;
        weightKg?: number | undefined;
        hrvRmssd?: number | undefined;
        hrvRmssdBaseline?: number | undefined;
        hrvRmssdDeviation?: number | undefined;
        sleepTotalMinutes?: number | undefined;
    }, {
        bodyFatPercent?: number | undefined;
        steps?: number | undefined;
        trainingLoad?: number | undefined;
        weightKg?: number | undefined;
        hrvRmssd?: number | undefined;
        hrvRmssdBaseline?: number | undefined;
        hrvRmssdDeviation?: number | undefined;
        sleepTotalMinutes?: number | undefined;
    }>;
    insights: z.ZodObject<{
        count: z.ZodNumber;
        severities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        tags: z.ZodArray<z.ZodString, "many">;
        kinds: z.ZodArray<z.ZodString, "many">;
        ids: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        count: number;
        tags: string[];
        kinds: string[];
        ids: string[];
        severities?: Record<string, number> | undefined;
    }, {
        count: number;
        tags: string[];
        kinds: string[];
        ids: string[];
        severities?: Record<string, number> | undefined;
    }>;
    readiness: z.ZodObject<{
        hasDailyFacts: z.ZodBoolean;
        hasInsights: z.ZodBoolean;
        domainMeetsConfidence: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        hasDailyFacts: boolean;
        hasInsights: boolean;
        domainMeetsConfidence?: Record<string, boolean> | undefined;
    }, {
        hasDailyFacts: boolean;
        hasInsights: boolean;
        domainMeetsConfidence?: Record<string, boolean> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    date: string;
    schemaVersion: 1;
    id: string;
    userId: string;
    computedAt: string;
    version: string;
    facts: {
        bodyFatPercent?: number | undefined;
        steps?: number | undefined;
        trainingLoad?: number | undefined;
        weightKg?: number | undefined;
        hrvRmssd?: number | undefined;
        hrvRmssdBaseline?: number | undefined;
        hrvRmssdDeviation?: number | undefined;
        sleepTotalMinutes?: number | undefined;
    };
    insights: {
        count: number;
        tags: string[];
        kinds: string[];
        ids: string[];
        severities?: Record<string, number> | undefined;
    };
    readiness: {
        hasDailyFacts: boolean;
        hasInsights: boolean;
        domainMeetsConfidence?: Record<string, boolean> | undefined;
    };
    meta?: {
        computedAt: string;
        pipelineVersion: number;
        source?: Record<string, unknown> | undefined;
    } | undefined;
    confidence?: Record<string, number> | undefined;
}, {
    date: string;
    schemaVersion: 1;
    id: string;
    userId: string;
    computedAt: string;
    version: string;
    facts: {
        bodyFatPercent?: number | undefined;
        steps?: number | undefined;
        trainingLoad?: number | undefined;
        weightKg?: number | undefined;
        hrvRmssd?: number | undefined;
        hrvRmssdBaseline?: number | undefined;
        hrvRmssdDeviation?: number | undefined;
        sleepTotalMinutes?: number | undefined;
    };
    insights: {
        count: number;
        tags: string[];
        kinds: string[];
        ids: string[];
        severities?: Record<string, number> | undefined;
    };
    readiness: {
        hasDailyFacts: boolean;
        hasInsights: boolean;
        domainMeetsConfidence?: Record<string, boolean> | undefined;
    };
    meta?: {
        computedAt: string;
        pipelineVersion: number;
        source?: Record<string, unknown> | undefined;
    } | undefined;
    confidence?: Record<string, number> | undefined;
}>;
export type IntelligenceContextDto = z.infer<typeof intelligenceContextDtoSchema>;
//# sourceMappingURL=intelligenceContext.d.ts.map