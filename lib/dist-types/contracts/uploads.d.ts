/**
 * Uploads presence (read-only UI surface).
 * GET /users/me/uploads
 */
import { z } from "zod";
export declare const uploadsPresenceLatestDtoSchema: z.ZodObject<{
    rawEventId: z.ZodString;
    observedAt: z.ZodString;
    receivedAt: z.ZodString;
    originalFilename: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rawEventId: string;
    receivedAt: string;
    observedAt: string;
    mimeType?: string | undefined;
    originalFilename?: string | undefined;
}, {
    rawEventId: string;
    receivedAt: string;
    observedAt: string;
    mimeType?: string | undefined;
    originalFilename?: string | undefined;
}>;
export declare const uploadsPresenceResponseDtoSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    count: z.ZodNumber;
    latest: z.ZodNullable<z.ZodObject<{
        rawEventId: z.ZodString;
        observedAt: z.ZodString;
        receivedAt: z.ZodString;
        originalFilename: z.ZodOptional<z.ZodString>;
        mimeType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        rawEventId: string;
        receivedAt: string;
        observedAt: string;
        mimeType?: string | undefined;
        originalFilename?: string | undefined;
    }, {
        rawEventId: string;
        receivedAt: string;
        observedAt: string;
        mimeType?: string | undefined;
        originalFilename?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    ok: true;
    count: number;
    latest: {
        rawEventId: string;
        receivedAt: string;
        observedAt: string;
        mimeType?: string | undefined;
        originalFilename?: string | undefined;
    } | null;
}, {
    ok: true;
    count: number;
    latest: {
        rawEventId: string;
        receivedAt: string;
        observedAt: string;
        mimeType?: string | undefined;
        originalFilename?: string | undefined;
    } | null;
}>;
export type UploadsPresenceLatestDto = z.infer<typeof uploadsPresenceLatestDtoSchema>;
export type UploadsPresenceResponseDto = z.infer<typeof uploadsPresenceResponseDtoSchema>;
//# sourceMappingURL=uploads.d.ts.map