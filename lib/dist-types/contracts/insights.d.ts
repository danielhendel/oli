import { z } from "zod";
export declare const insightSeveritySchema: z.ZodEnum<["info", "warning", "critical"]>;
export declare const insightEvidencePointDtoSchema: z.ZodObject<{
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
}>;
export declare const insightDtoSchema: z.ZodObject<{
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
}>;
export type InsightDto = z.infer<typeof insightDtoSchema>;
export declare const insightsResponseDtoSchema: z.ZodObject<{
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
}>;
export type InsightsResponseDto = z.infer<typeof insightsResponseDtoSchema>;
//# sourceMappingURL=insights.d.ts.map