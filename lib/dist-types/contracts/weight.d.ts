import { z } from "zod";
export declare const manualWeightPayloadSchema: z.ZodObject<{
    time: z.ZodString;
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
export type ManualWeightPayload = z.infer<typeof manualWeightPayloadSchema>;
export declare const logWeightRequestDtoSchema: z.ZodObject<{
    time: z.ZodString;
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
export type LogWeightRequestDto = z.infer<typeof logWeightRequestDtoSchema>;
export declare const logWeightResponseDtoSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    rawEventId: z.ZodString;
    day: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ok: true;
    day: string;
    rawEventId: string;
}, {
    ok: true;
    day: string;
    rawEventId: string;
}>;
export type LogWeightResponseDto = z.infer<typeof logWeightResponseDtoSchema>;
//# sourceMappingURL=weight.d.ts.map