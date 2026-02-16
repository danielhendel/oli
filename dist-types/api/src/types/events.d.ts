import { z } from "zod";
export declare const eventSchema: z.ZodObject<{
    type: z.ZodString;
    source: z.ZodString;
    timestamp: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    data: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export type EventPayload = z.infer<typeof eventSchema>;
//# sourceMappingURL=events.d.ts.map