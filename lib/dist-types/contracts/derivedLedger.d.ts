import { z } from "zod";
export declare const derivedLedgerRunSummaryDtoSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    runId: z.ZodString;
    userId: z.ZodString;
    date: z.ZodString;
    computedAt: z.ZodString;
    pipelineVersion: z.ZodNumber;
    trigger: z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"realtime">;
        name: z.ZodLiteral<"onCanonicalEventCreated">;
        eventId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: "onCanonicalEventCreated";
        type: "realtime";
        eventId: string;
    }, {
        name: "onCanonicalEventCreated";
        type: "realtime";
        eventId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"realtime">;
        name: z.ZodLiteral<"onRawEventCreated_factOnly">;
        eventId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: "onRawEventCreated_factOnly";
        type: "realtime";
        eventId: string;
    }, {
        name: "onRawEventCreated_factOnly";
        type: "realtime";
        eventId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"scheduled">;
        name: z.ZodString;
        eventId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "scheduled";
        eventId: string;
    }, {
        name: string;
        type: "scheduled";
        eventId: string;
    }>]>;
    latestCanonicalEventAt: z.ZodOptional<z.ZodString>;
    outputs: z.ZodObject<{
        hasDailyFacts: z.ZodBoolean;
        insightsCount: z.ZodNumber;
        hasIntelligenceContext: z.ZodBoolean;
        hasHealthScore: z.ZodOptional<z.ZodBoolean>;
        hasHealthSignals: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        hasDailyFacts: boolean;
        insightsCount: number;
        hasIntelligenceContext: boolean;
        hasHealthScore?: boolean | undefined;
        hasHealthSignals?: boolean | undefined;
    }, {
        hasDailyFacts: boolean;
        insightsCount: number;
        hasIntelligenceContext: boolean;
        hasHealthScore?: boolean | undefined;
        hasHealthSignals?: boolean | undefined;
    }>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    schemaVersion: 1;
    userId: string;
    computedAt: string;
    pipelineVersion: number;
    createdAt: string;
    runId: string;
    trigger: {
        name: "onCanonicalEventCreated";
        type: "realtime";
        eventId: string;
    } | {
        name: "onRawEventCreated_factOnly";
        type: "realtime";
        eventId: string;
    } | {
        name: string;
        type: "scheduled";
        eventId: string;
    };
    outputs: {
        hasDailyFacts: boolean;
        insightsCount: number;
        hasIntelligenceContext: boolean;
        hasHealthScore?: boolean | undefined;
        hasHealthSignals?: boolean | undefined;
    };
    latestCanonicalEventAt?: string | undefined;
}, {
    date: string;
    schemaVersion: 1;
    userId: string;
    computedAt: string;
    pipelineVersion: number;
    createdAt: string;
    runId: string;
    trigger: {
        name: "onCanonicalEventCreated";
        type: "realtime";
        eventId: string;
    } | {
        name: "onRawEventCreated_factOnly";
        type: "realtime";
        eventId: string;
    } | {
        name: string;
        type: "scheduled";
        eventId: string;
    };
    outputs: {
        hasDailyFacts: boolean;
        insightsCount: number;
        hasIntelligenceContext: boolean;
        hasHealthScore?: boolean | undefined;
        hasHealthSignals?: boolean | undefined;
    };
    latestCanonicalEventAt?: string | undefined;
}>;
export type DerivedLedgerRunSummaryDto = z.infer<typeof derivedLedgerRunSummaryDtoSchema>;
export declare const derivedLedgerRunsResponseDtoSchema: z.ZodObject<{
    day: z.ZodString;
    latestRunId: z.ZodOptional<z.ZodString>;
    runs: z.ZodArray<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        runId: z.ZodString;
        userId: z.ZodString;
        date: z.ZodString;
        computedAt: z.ZodString;
        pipelineVersion: z.ZodNumber;
        trigger: z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"realtime">;
            name: z.ZodLiteral<"onCanonicalEventCreated">;
            eventId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: "onCanonicalEventCreated";
            type: "realtime";
            eventId: string;
        }, {
            name: "onCanonicalEventCreated";
            type: "realtime";
            eventId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"realtime">;
            name: z.ZodLiteral<"onRawEventCreated_factOnly">;
            eventId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: "onRawEventCreated_factOnly";
            type: "realtime";
            eventId: string;
        }, {
            name: "onRawEventCreated_factOnly";
            type: "realtime";
            eventId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"scheduled">;
            name: z.ZodString;
            eventId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            type: "scheduled";
            eventId: string;
        }, {
            name: string;
            type: "scheduled";
            eventId: string;
        }>]>;
        latestCanonicalEventAt: z.ZodOptional<z.ZodString>;
        outputs: z.ZodObject<{
            hasDailyFacts: z.ZodBoolean;
            insightsCount: z.ZodNumber;
            hasIntelligenceContext: z.ZodBoolean;
            hasHealthScore: z.ZodOptional<z.ZodBoolean>;
            hasHealthSignals: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            hasDailyFacts: boolean;
            insightsCount: number;
            hasIntelligenceContext: boolean;
            hasHealthScore?: boolean | undefined;
            hasHealthSignals?: boolean | undefined;
        }, {
            hasDailyFacts: boolean;
            insightsCount: number;
            hasIntelligenceContext: boolean;
            hasHealthScore?: boolean | undefined;
            hasHealthSignals?: boolean | undefined;
        }>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        date: string;
        schemaVersion: 1;
        userId: string;
        computedAt: string;
        pipelineVersion: number;
        createdAt: string;
        runId: string;
        trigger: {
            name: "onCanonicalEventCreated";
            type: "realtime";
            eventId: string;
        } | {
            name: "onRawEventCreated_factOnly";
            type: "realtime";
            eventId: string;
        } | {
            name: string;
            type: "scheduled";
            eventId: string;
        };
        outputs: {
            hasDailyFacts: boolean;
            insightsCount: number;
            hasIntelligenceContext: boolean;
            hasHealthScore?: boolean | undefined;
            hasHealthSignals?: boolean | undefined;
        };
        latestCanonicalEventAt?: string | undefined;
    }, {
        date: string;
        schemaVersion: 1;
        userId: string;
        computedAt: string;
        pipelineVersion: number;
        createdAt: string;
        runId: string;
        trigger: {
            name: "onCanonicalEventCreated";
            type: "realtime";
            eventId: string;
        } | {
            name: "onRawEventCreated_factOnly";
            type: "realtime";
            eventId: string;
        } | {
            name: string;
            type: "scheduled";
            eventId: string;
        };
        outputs: {
            hasDailyFacts: boolean;
            insightsCount: number;
            hasIntelligenceContext: boolean;
            hasHealthScore?: boolean | undefined;
            hasHealthSignals?: boolean | undefined;
        };
        latestCanonicalEventAt?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    day: string;
    runs: {
        date: string;
        schemaVersion: 1;
        userId: string;
        computedAt: string;
        pipelineVersion: number;
        createdAt: string;
        runId: string;
        trigger: {
            name: "onCanonicalEventCreated";
            type: "realtime";
            eventId: string;
        } | {
            name: "onRawEventCreated_factOnly";
            type: "realtime";
            eventId: string;
        } | {
            name: string;
            type: "scheduled";
            eventId: string;
        };
        outputs: {
            hasDailyFacts: boolean;
            insightsCount: number;
            hasIntelligenceContext: boolean;
            hasHealthScore?: boolean | undefined;
            hasHealthSignals?: boolean | undefined;
        };
        latestCanonicalEventAt?: string | undefined;
    }[];
    latestRunId?: string | undefined;
}, {
    day: string;
    runs: {
        date: string;
        schemaVersion: 1;
        userId: string;
        computedAt: string;
        pipelineVersion: number;
        createdAt: string;
        runId: string;
        trigger: {
            name: "onCanonicalEventCreated";
            type: "realtime";
            eventId: string;
        } | {
            name: "onRawEventCreated_factOnly";
            type: "realtime";
            eventId: string;
        } | {
            name: string;
            type: "scheduled";
            eventId: string;
        };
        outputs: {
            hasDailyFacts: boolean;
            insightsCount: number;
            hasIntelligenceContext: boolean;
            hasHealthScore?: boolean | undefined;
            hasHealthSignals?: boolean | undefined;
        };
        latestCanonicalEventAt?: string | undefined;
    }[];
    latestRunId?: string | undefined;
}>;
export type DerivedLedgerRunsResponseDto = z.infer<typeof derivedLedgerRunsResponseDtoSchema>;
export declare const derivedLedgerReplayResponseDtoSchema: z.ZodObject<{
    day: z.ZodString;
    runId: z.ZodString;
    computedAt: z.ZodString;
    pipelineVersion: z.ZodNumber;
    trigger: z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"realtime">;
        name: z.ZodLiteral<"onCanonicalEventCreated">;
        eventId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: "onCanonicalEventCreated";
        type: "realtime";
        eventId: string;
    }, {
        name: "onCanonicalEventCreated";
        type: "realtime";
        eventId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"realtime">;
        name: z.ZodLiteral<"onRawEventCreated_factOnly">;
        eventId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: "onRawEventCreated_factOnly";
        type: "realtime";
        eventId: string;
    }, {
        name: "onRawEventCreated_factOnly";
        type: "realtime";
        eventId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"scheduled">;
        name: z.ZodString;
        eventId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "scheduled";
        eventId: string;
    }, {
        name: string;
        type: "scheduled";
        eventId: string;
    }>]>;
    latestCanonicalEventAt: z.ZodOptional<z.ZodString>;
    dailyFacts: z.ZodOptional<z.ZodObject<{
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
    }>>;
    intelligenceContext: z.ZodOptional<z.ZodObject<{
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
    }>>;
    insights: z.ZodOptional<z.ZodObject<{
        day: z.ZodString;
        count: z.ZodNumber;
        items: z.ZodArray<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            userId: z.ZodString;
            date: z.ZodString;
            kind: z.ZodString;
            title: z.ZodString;
            message: z.ZodString;
            severity: z.ZodEnum<["info", "warning", "critical"]>;
            evidence: z.ZodArray<z.ZodObject<{
                factPath: z.ZodString;
                value: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean, z.ZodNull]>;
                threshold: z.ZodOptional<z.ZodNumber>;
                direction: z.ZodOptional<z.ZodEnum<["above", "below", "outside_range"]>>;
            }, "strip", z.ZodTypeAny, {
                value: string | number | boolean | null;
                factPath: string;
                threshold?: number | undefined;
                direction?: "above" | "below" | "outside_range" | undefined;
            }, {
                value: string | number | boolean | null;
                factPath: string;
                threshold?: number | undefined;
                direction?: "above" | "below" | "outside_range" | undefined;
            }>, "many">;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            ruleVersion: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            kind: string;
            message: string;
            date: string;
            schemaVersion: 1;
            id: string;
            userId: string;
            title: string;
            severity: "info" | "warning" | "critical";
            evidence: {
                value: string | number | boolean | null;
                factPath: string;
                threshold?: number | undefined;
                direction?: "above" | "below" | "outside_range" | undefined;
            }[];
            createdAt: string;
            updatedAt: string;
            ruleVersion: string;
            tags?: string[] | undefined;
        }, {
            kind: string;
            message: string;
            date: string;
            schemaVersion: 1;
            id: string;
            userId: string;
            title: string;
            severity: "info" | "warning" | "critical";
            evidence: {
                value: string | number | boolean | null;
                factPath: string;
                threshold?: number | undefined;
                direction?: "above" | "below" | "outside_range" | undefined;
            }[];
            createdAt: string;
            updatedAt: string;
            ruleVersion: string;
            tags?: string[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        day: string;
        count: number;
        items: {
            kind: string;
            message: string;
            date: string;
            schemaVersion: 1;
            id: string;
            userId: string;
            title: string;
            severity: "info" | "warning" | "critical";
            evidence: {
                value: string | number | boolean | null;
                factPath: string;
                threshold?: number | undefined;
                direction?: "above" | "below" | "outside_range" | undefined;
            }[];
            createdAt: string;
            updatedAt: string;
            ruleVersion: string;
            tags?: string[] | undefined;
        }[];
    }, {
        day: string;
        count: number;
        items: {
            kind: string;
            message: string;
            date: string;
            schemaVersion: 1;
            id: string;
            userId: string;
            title: string;
            severity: "info" | "warning" | "critical";
            evidence: {
                value: string | number | boolean | null;
                factPath: string;
                threshold?: number | undefined;
                direction?: "above" | "below" | "outside_range" | undefined;
            }[];
            createdAt: string;
            updatedAt: string;
            ruleVersion: string;
            tags?: string[] | undefined;
        }[];
    }>>;
    healthScore: z.ZodOptional<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        modelVersion: z.ZodLiteral<"1.0">;
        date: z.ZodString;
        compositeScore: z.ZodNumber;
        compositeTier: z.ZodEnum<["excellent", "good", "fair", "poor"]>;
        domainScores: z.ZodObject<{
            recovery: z.ZodObject<{
                score: z.ZodNumber;
                tier: z.ZodEnum<["excellent", "good", "fair", "poor"]>;
                missing: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            }, {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            }>;
            training: z.ZodObject<{
                score: z.ZodNumber;
                tier: z.ZodEnum<["excellent", "good", "fair", "poor"]>;
                missing: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            }, {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            }>;
            nutrition: z.ZodObject<{
                score: z.ZodNumber;
                tier: z.ZodEnum<["excellent", "good", "fair", "poor"]>;
                missing: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            }, {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            }>;
            body: z.ZodObject<{
                score: z.ZodNumber;
                tier: z.ZodEnum<["excellent", "good", "fair", "poor"]>;
                missing: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            }, {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            }>;
        }, "strip", z.ZodTypeAny, {
            nutrition: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            recovery: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            body: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            training: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
        }, {
            nutrition: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            recovery: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            body: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            training: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
        }>;
        status: z.ZodEnum<["stable", "attention_required", "insufficient_data"]>;
        computedAt: z.ZodString;
        pipelineVersion: z.ZodNumber;
        inputs: z.ZodObject<{
            hasDailyFacts: z.ZodBoolean;
            historyDaysUsed: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            hasDailyFacts: boolean;
            historyDaysUsed: number;
        }, {
            hasDailyFacts: boolean;
            historyDaysUsed: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        status: "stable" | "attention_required" | "insufficient_data";
        date: string;
        schemaVersion: 1;
        computedAt: string;
        pipelineVersion: number;
        modelVersion: "1.0";
        compositeScore: number;
        compositeTier: "excellent" | "good" | "fair" | "poor";
        domainScores: {
            nutrition: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            recovery: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            body: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            training: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
        };
        inputs: {
            hasDailyFacts: boolean;
            historyDaysUsed: number;
        };
    }, {
        status: "stable" | "attention_required" | "insufficient_data";
        date: string;
        schemaVersion: 1;
        computedAt: string;
        pipelineVersion: number;
        modelVersion: "1.0";
        compositeScore: number;
        compositeTier: "excellent" | "good" | "fair" | "poor";
        domainScores: {
            nutrition: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            recovery: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            body: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            training: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
        };
        inputs: {
            hasDailyFacts: boolean;
            historyDaysUsed: number;
        };
    }>>;
    healthSignals: z.ZodOptional<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        modelVersion: z.ZodLiteral<"1.0">;
        date: z.ZodString;
        status: z.ZodEnum<["stable", "attention_required"]>;
        readiness: z.ZodEnum<["missing", "partial", "ready", "error"]>;
        computedAt: z.ZodString;
        pipelineVersion: z.ZodNumber;
        inputs: z.ZodObject<{
            healthScoreDayKey: z.ZodString;
            baselineWindowDays: z.ZodNumber;
            baselineDaysPresent: z.ZodNumber;
            thresholds: z.ZodObject<{
                compositeAttentionLt: z.ZodNumber;
                domainAttentionLt: z.ZodNumber;
                deviationAttentionPctLt: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                compositeAttentionLt: number;
                domainAttentionLt: number;
                deviationAttentionPctLt: number;
            }, {
                compositeAttentionLt: number;
                domainAttentionLt: number;
                deviationAttentionPctLt: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            healthScoreDayKey: string;
            baselineWindowDays: number;
            baselineDaysPresent: number;
            thresholds: {
                compositeAttentionLt: number;
                domainAttentionLt: number;
                deviationAttentionPctLt: number;
            };
        }, {
            healthScoreDayKey: string;
            baselineWindowDays: number;
            baselineDaysPresent: number;
            thresholds: {
                compositeAttentionLt: number;
                domainAttentionLt: number;
                deviationAttentionPctLt: number;
            };
        }>;
        reasons: z.ZodArray<z.ZodString, "many">;
        missingInputs: z.ZodArray<z.ZodString, "many">;
        domainEvidence: z.ZodObject<{
            recovery: z.ZodObject<{
                score: z.ZodNumber;
                baselineMean: z.ZodNumber;
                deviationPct: z.ZodNullable<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            }, {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            }>;
            training: z.ZodObject<{
                score: z.ZodNumber;
                baselineMean: z.ZodNumber;
                deviationPct: z.ZodNullable<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            }, {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            }>;
            nutrition: z.ZodObject<{
                score: z.ZodNumber;
                baselineMean: z.ZodNumber;
                deviationPct: z.ZodNullable<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            }, {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            }>;
            body: z.ZodObject<{
                score: z.ZodNumber;
                baselineMean: z.ZodNumber;
                deviationPct: z.ZodNullable<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            }, {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            }>;
        }, "strip", z.ZodTypeAny, {
            nutrition: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            recovery: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            body: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            training: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
        }, {
            nutrition: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            recovery: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            body: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            training: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        status: "stable" | "attention_required";
        date: string;
        schemaVersion: 1;
        computedAt: string;
        pipelineVersion: number;
        readiness: "error" | "missing" | "partial" | "ready";
        modelVersion: "1.0";
        inputs: {
            healthScoreDayKey: string;
            baselineWindowDays: number;
            baselineDaysPresent: number;
            thresholds: {
                compositeAttentionLt: number;
                domainAttentionLt: number;
                deviationAttentionPctLt: number;
            };
        };
        reasons: string[];
        missingInputs: string[];
        domainEvidence: {
            nutrition: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            recovery: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            body: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            training: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
        };
    }, {
        status: "stable" | "attention_required";
        date: string;
        schemaVersion: 1;
        computedAt: string;
        pipelineVersion: number;
        readiness: "error" | "missing" | "partial" | "ready";
        modelVersion: "1.0";
        inputs: {
            healthScoreDayKey: string;
            baselineWindowDays: number;
            baselineDaysPresent: number;
            thresholds: {
                compositeAttentionLt: number;
                domainAttentionLt: number;
                deviationAttentionPctLt: number;
            };
        };
        reasons: string[];
        missingInputs: string[];
        domainEvidence: {
            nutrition: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            recovery: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            body: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            training: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    day: string;
    computedAt: string;
    pipelineVersion: number;
    runId: string;
    trigger: {
        name: "onCanonicalEventCreated";
        type: "realtime";
        eventId: string;
    } | {
        name: "onRawEventCreated_factOnly";
        type: "realtime";
        eventId: string;
    } | {
        name: string;
        type: "scheduled";
        eventId: string;
    };
    insights?: {
        day: string;
        count: number;
        items: {
            kind: string;
            message: string;
            date: string;
            schemaVersion: 1;
            id: string;
            userId: string;
            title: string;
            severity: "info" | "warning" | "critical";
            evidence: {
                value: string | number | boolean | null;
                factPath: string;
                threshold?: number | undefined;
                direction?: "above" | "below" | "outside_range" | undefined;
            }[];
            createdAt: string;
            updatedAt: string;
            ruleVersion: string;
            tags?: string[] | undefined;
        }[];
    } | undefined;
    latestCanonicalEventAt?: string | undefined;
    dailyFacts?: {
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
    } | undefined;
    intelligenceContext?: {
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
    } | undefined;
    healthScore?: {
        status: "stable" | "attention_required" | "insufficient_data";
        date: string;
        schemaVersion: 1;
        computedAt: string;
        pipelineVersion: number;
        modelVersion: "1.0";
        compositeScore: number;
        compositeTier: "excellent" | "good" | "fair" | "poor";
        domainScores: {
            nutrition: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            recovery: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            body: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            training: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
        };
        inputs: {
            hasDailyFacts: boolean;
            historyDaysUsed: number;
        };
    } | undefined;
    healthSignals?: {
        status: "stable" | "attention_required";
        date: string;
        schemaVersion: 1;
        computedAt: string;
        pipelineVersion: number;
        readiness: "error" | "missing" | "partial" | "ready";
        modelVersion: "1.0";
        inputs: {
            healthScoreDayKey: string;
            baselineWindowDays: number;
            baselineDaysPresent: number;
            thresholds: {
                compositeAttentionLt: number;
                domainAttentionLt: number;
                deviationAttentionPctLt: number;
            };
        };
        reasons: string[];
        missingInputs: string[];
        domainEvidence: {
            nutrition: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            recovery: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            body: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            training: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
        };
    } | undefined;
}, {
    day: string;
    computedAt: string;
    pipelineVersion: number;
    runId: string;
    trigger: {
        name: "onCanonicalEventCreated";
        type: "realtime";
        eventId: string;
    } | {
        name: "onRawEventCreated_factOnly";
        type: "realtime";
        eventId: string;
    } | {
        name: string;
        type: "scheduled";
        eventId: string;
    };
    insights?: {
        day: string;
        count: number;
        items: {
            kind: string;
            message: string;
            date: string;
            schemaVersion: 1;
            id: string;
            userId: string;
            title: string;
            severity: "info" | "warning" | "critical";
            evidence: {
                value: string | number | boolean | null;
                factPath: string;
                threshold?: number | undefined;
                direction?: "above" | "below" | "outside_range" | undefined;
            }[];
            createdAt: string;
            updatedAt: string;
            ruleVersion: string;
            tags?: string[] | undefined;
        }[];
    } | undefined;
    latestCanonicalEventAt?: string | undefined;
    dailyFacts?: {
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
    } | undefined;
    intelligenceContext?: {
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
    } | undefined;
    healthScore?: {
        status: "stable" | "attention_required" | "insufficient_data";
        date: string;
        schemaVersion: 1;
        computedAt: string;
        pipelineVersion: number;
        modelVersion: "1.0";
        compositeScore: number;
        compositeTier: "excellent" | "good" | "fair" | "poor";
        domainScores: {
            nutrition: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            recovery: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            body: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
            training: {
                score: number;
                tier: "excellent" | "good" | "fair" | "poor";
                missing: string[];
            };
        };
        inputs: {
            hasDailyFacts: boolean;
            historyDaysUsed: number;
        };
    } | undefined;
    healthSignals?: {
        status: "stable" | "attention_required";
        date: string;
        schemaVersion: 1;
        computedAt: string;
        pipelineVersion: number;
        readiness: "error" | "missing" | "partial" | "ready";
        modelVersion: "1.0";
        inputs: {
            healthScoreDayKey: string;
            baselineWindowDays: number;
            baselineDaysPresent: number;
            thresholds: {
                compositeAttentionLt: number;
                domainAttentionLt: number;
                deviationAttentionPctLt: number;
            };
        };
        reasons: string[];
        missingInputs: string[];
        domainEvidence: {
            nutrition: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            recovery: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            body: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
            training: {
                score: number;
                baselineMean: number;
                deviationPct: number | null;
            };
        };
    } | undefined;
}>;
export type DerivedLedgerReplayResponseDto = z.infer<typeof derivedLedgerReplayResponseDtoSchema>;
//# sourceMappingURL=derivedLedger.d.ts.map