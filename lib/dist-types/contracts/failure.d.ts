/**
 * Failure Memory DTOs (read-only UI surface).
 *
 * Source of truth: API runtime DTO validation (services/api).
 * Client must not invent semantics beyond these fields.
 */
import { z } from "zod";
export declare const failureDetailsDtoSchema: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
export type FailureDetailsDto = z.infer<typeof failureDetailsDtoSchema>;
export declare const failureListItemDtoSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    code: z.ZodString;
    message: z.ZodString;
    day: z.ZodString;
    createdAt: z.ZodString;
    timeZone: z.ZodOptional<z.ZodString>;
    observedAt: z.ZodOptional<z.ZodString>;
    rawEventId: z.ZodOptional<z.ZodString>;
    rawEventPath: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    code: string;
    type: string;
    day: string;
    id: string;
    createdAt: string;
    rawEventId?: string | undefined;
    timeZone?: string | undefined;
    observedAt?: string | undefined;
    rawEventPath?: string | undefined;
    details?: Record<string, unknown> | null | undefined;
}, {
    message: string;
    code: string;
    type: string;
    day: string;
    id: string;
    createdAt: string;
    rawEventId?: string | undefined;
    timeZone?: string | undefined;
    observedAt?: string | undefined;
    rawEventPath?: string | undefined;
    details?: Record<string, unknown> | null | undefined;
}>;
export type FailureListItemDto = z.infer<typeof failureListItemDtoSchema>;
export declare const failureListResponseDtoSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        code: z.ZodString;
        message: z.ZodString;
        day: z.ZodString;
        createdAt: z.ZodString;
        timeZone: z.ZodOptional<z.ZodString>;
        observedAt: z.ZodOptional<z.ZodString>;
        rawEventId: z.ZodOptional<z.ZodString>;
        rawEventPath: z.ZodOptional<z.ZodString>;
        details: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        type: string;
        day: string;
        id: string;
        createdAt: string;
        rawEventId?: string | undefined;
        timeZone?: string | undefined;
        observedAt?: string | undefined;
        rawEventPath?: string | undefined;
        details?: Record<string, unknown> | null | undefined;
    }, {
        message: string;
        code: string;
        type: string;
        day: string;
        id: string;
        createdAt: string;
        rawEventId?: string | undefined;
        timeZone?: string | undefined;
        observedAt?: string | undefined;
        rawEventPath?: string | undefined;
        details?: Record<string, unknown> | null | undefined;
    }>, "many">;
    nextCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        message: string;
        code: string;
        type: string;
        day: string;
        id: string;
        createdAt: string;
        rawEventId?: string | undefined;
        timeZone?: string | undefined;
        observedAt?: string | undefined;
        rawEventPath?: string | undefined;
        details?: Record<string, unknown> | null | undefined;
    }[];
    nextCursor: string | null;
}, {
    items: {
        message: string;
        code: string;
        type: string;
        day: string;
        id: string;
        createdAt: string;
        rawEventId?: string | undefined;
        timeZone?: string | undefined;
        observedAt?: string | undefined;
        rawEventPath?: string | undefined;
        details?: Record<string, unknown> | null | undefined;
    }[];
    nextCursor: string | null;
}>;
export type FailureListResponseDto = z.infer<typeof failureListResponseDtoSchema>;
//# sourceMappingURL=failure.d.ts.map