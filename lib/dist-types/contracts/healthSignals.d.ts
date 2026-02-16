import { z } from "zod";
export declare const healthSignalStatusSchema: z.ZodEnum<["stable", "attention_required"]>;
export type HealthSignalStatus = z.infer<typeof healthSignalStatusSchema>;
export declare const healthSignalReadinessSchema: z.ZodEnum<["missing", "partial", "ready", "error"]>;
export type HealthSignalReadiness = z.infer<typeof healthSignalReadinessSchema>;
export declare const healthSignalInputsSchema: z.ZodObject<{
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
declare const domainEvidenceRecordSchema: z.ZodObject<{
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
/**
 * Health Signal document schema (users/{uid}/healthSignals/{dayKey}).
 * Server-computed only; client read-only.
 */
export declare const healthSignalDocSchema: z.ZodObject<{
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
}>;
export type HealthSignalDoc = z.infer<typeof healthSignalDocSchema>;
export type HealthSignalInputs = z.infer<typeof healthSignalInputsSchema>;
export type HealthSignalDomainEvidence = z.infer<typeof domainEvidenceRecordSchema>;
export {};
//# sourceMappingURL=healthSignals.d.ts.map