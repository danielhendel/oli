import { z } from "zod";
/**
 * Canonical day key: YYYY-MM-DD
 */
export declare const dayKeySchema: z.ZodString;
export type DayKey = z.infer<typeof dayKeySchema>;
export declare const dayQuerySchema: z.ZodObject<{
    day: z.ZodString;
}, "strip", z.ZodTypeAny, {
    day: string;
}, {
    day: string;
}>;
export type DayQuery = z.infer<typeof dayQuerySchema>;
//# sourceMappingURL=day.d.ts.map