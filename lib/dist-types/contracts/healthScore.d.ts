import { z } from "zod";
export declare const healthScoreTierSchema: z.ZodEnum<["excellent", "good", "fair", "poor"]>;
export type HealthScoreTier = z.infer<typeof healthScoreTierSchema>;
export declare const healthScoreStatusSchema: z.ZodEnum<["stable", "attention_required", "insufficient_data"]>;
export type HealthScoreStatus = z.infer<typeof healthScoreStatusSchema>;
export declare const healthScoreDomainScoresSchema: z.ZodObject<{
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
/**
 * Health Score document schema (users/{uid}/healthScores/{dayKey}).
 * Server-computed only; client read-only.
 */
export declare const healthScoreDocSchema: z.ZodObject<{
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
}>;
export type HealthScoreDoc = z.infer<typeof healthScoreDocSchema>;
export type HealthScoreDomainScores = z.infer<typeof healthScoreDomainScoresSchema>;
//# sourceMappingURL=healthScore.d.ts.map