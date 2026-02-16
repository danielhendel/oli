import { z } from "zod";
export declare const dayTruthDtoSchema: z.ZodObject<{
    day: z.ZodString;
    eventsCount: z.ZodNumber;
    latestCanonicalEventAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    day: string;
    latestCanonicalEventAt: string | null;
    eventsCount: number;
}, {
    day: string;
    latestCanonicalEventAt: string | null;
    eventsCount: number;
}>;
export type DayTruthDto = z.infer<typeof dayTruthDtoSchema>;
//# sourceMappingURL=dayTruth.d.ts.map