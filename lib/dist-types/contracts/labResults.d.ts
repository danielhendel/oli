import { z } from "zod";
export declare const biomarkerReadingDtoSchema: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodNumber;
    unit: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    value: number;
    unit: string;
}, {
    name: string;
    value: number;
    unit: string;
}>;
export declare const labResultDtoSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    userId: z.ZodString;
    collectedAt: z.ZodString;
    sourceRawEventId: z.ZodOptional<z.ZodString>;
    biomarkers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodNumber;
        unit: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        value: number;
        unit: string;
    }, {
        name: string;
        value: number;
        unit: string;
    }>, "many">;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    schemaVersion: 1;
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    collectedAt: string;
    biomarkers: {
        name: string;
        value: number;
        unit: string;
    }[];
    sourceRawEventId?: string | undefined;
}, {
    schemaVersion: 1;
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    collectedAt: string;
    biomarkers: {
        name: string;
        value: number;
        unit: string;
    }[];
    sourceRawEventId?: string | undefined;
}>;
export declare const labResultsListResponseDtoSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    items: z.ZodArray<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        userId: z.ZodString;
        collectedAt: z.ZodString;
        sourceRawEventId: z.ZodOptional<z.ZodString>;
        biomarkers: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodNumber;
            unit: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            value: number;
            unit: string;
        }, {
            name: string;
            value: number;
            unit: string;
        }>, "many">;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        schemaVersion: 1;
        id: string;
        userId: string;
        createdAt: string;
        updatedAt: string;
        collectedAt: string;
        biomarkers: {
            name: string;
            value: number;
            unit: string;
        }[];
        sourceRawEventId?: string | undefined;
    }, {
        schemaVersion: 1;
        id: string;
        userId: string;
        createdAt: string;
        updatedAt: string;
        collectedAt: string;
        biomarkers: {
            name: string;
            value: number;
            unit: string;
        }[];
        sourceRawEventId?: string | undefined;
    }>, "many">;
    nextCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ok: true;
    items: {
        schemaVersion: 1;
        id: string;
        userId: string;
        createdAt: string;
        updatedAt: string;
        collectedAt: string;
        biomarkers: {
            name: string;
            value: number;
            unit: string;
        }[];
        sourceRawEventId?: string | undefined;
    }[];
    nextCursor: string | null;
}, {
    ok: true;
    items: {
        schemaVersion: 1;
        id: string;
        userId: string;
        createdAt: string;
        updatedAt: string;
        collectedAt: string;
        biomarkers: {
            name: string;
            value: number;
            unit: string;
        }[];
        sourceRawEventId?: string | undefined;
    }[];
    nextCursor: string | null;
}>;
export declare const createLabResultRequestDtoSchema: z.ZodObject<{
    collectedAt: z.ZodString;
    sourceRawEventId: z.ZodOptional<z.ZodString>;
    biomarkers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodNumber;
        unit: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        value: number;
        unit: string;
    }, {
        name: string;
        value: number;
        unit: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    collectedAt: string;
    biomarkers: {
        name: string;
        value: number;
        unit: string;
    }[];
    sourceRawEventId?: string | undefined;
}, {
    collectedAt: string;
    biomarkers: {
        name: string;
        value: number;
        unit: string;
    }[];
    sourceRawEventId?: string | undefined;
}>;
export declare const createLabResultResponseDtoSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    id: z.ZodString;
    idempotentReplay: z.ZodOptional<z.ZodLiteral<true>>;
}, "strip", z.ZodTypeAny, {
    ok: true;
    id: string;
    idempotentReplay?: true | undefined;
}, {
    ok: true;
    id: string;
    idempotentReplay?: true | undefined;
}>;
export type BiomarkerReadingDto = z.infer<typeof biomarkerReadingDtoSchema>;
export type LabResultDto = z.infer<typeof labResultDtoSchema>;
export type LabResultsListResponseDto = z.infer<typeof labResultsListResponseDtoSchema>;
export type CreateLabResultRequestDto = z.infer<typeof createLabResultRequestDtoSchema>;
export type CreateLabResultResponseDto = z.infer<typeof createLabResultResponseDtoSchema>;
//# sourceMappingURL=labResults.d.ts.map