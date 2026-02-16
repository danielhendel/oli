/**
 * Phase 1 Lock #6 — Canonical export job model.
 *
 * Export lifecycle: queued → running → succeeded | failed
 */
import { z } from "zod";
export declare const exportJobStatusSchema: z.ZodEnum<["queued", "running", "succeeded", "failed"]>;
export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>;
export declare const exportRequestResponseDtoSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    status: z.ZodEnum<["queued"]>;
    requestId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ok: true;
    status: "queued";
    requestId: string;
}, {
    ok: true;
    status: "queued";
    requestId: string;
}>;
export type ExportRequestResponseDto = z.infer<typeof exportRequestResponseDtoSchema>;
export declare const exportJobArtifactSchema: z.ZodObject<{
    artifactId: z.ZodString;
    contentType: z.ZodString;
    sizeBytes: z.ZodNullable<z.ZodNumber>;
    schemaVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sizeBytes: number | null;
    artifactId: string;
    contentType: string;
    schemaVersion?: number | undefined;
}, {
    sizeBytes: number | null;
    artifactId: string;
    contentType: string;
    schemaVersion?: number | undefined;
}>;
export type ExportJobArtifact = z.infer<typeof exportJobArtifactSchema>;
export declare const exportJobDocSchema: z.ZodObject<{
    uid: z.ZodString;
    requestId: z.ZodString;
    requestedAt: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["queued", "running", "succeeded", "failed"]>;
    updatedAt: z.ZodOptional<z.ZodUnknown>;
    artifact: z.ZodOptional<z.ZodObject<{
        artifactId: z.ZodString;
        contentType: z.ZodString;
        sizeBytes: z.ZodNullable<z.ZodNumber>;
        schemaVersion: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sizeBytes: number | null;
        artifactId: string;
        contentType: string;
        schemaVersion?: number | undefined;
    }, {
        sizeBytes: number | null;
        artifactId: string;
        contentType: string;
        schemaVersion?: number | undefined;
    }>>;
    error: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodUnknown>;
    startedAt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    status: "queued" | "running" | "succeeded" | "failed";
    requestId: string;
    uid: string;
    requestedAt: string | null;
    error?: string | undefined;
    startedAt?: unknown;
    updatedAt?: unknown;
    artifact?: {
        sizeBytes: number | null;
        artifactId: string;
        contentType: string;
        schemaVersion?: number | undefined;
    } | undefined;
    completedAt?: unknown;
}, {
    status: "queued" | "running" | "succeeded" | "failed";
    requestId: string;
    uid: string;
    requestedAt: string | null;
    error?: string | undefined;
    startedAt?: unknown;
    updatedAt?: unknown;
    artifact?: {
        sizeBytes: number | null;
        artifactId: string;
        contentType: string;
        schemaVersion?: number | undefined;
    } | undefined;
    completedAt?: unknown;
}>;
export type ExportJobDoc = z.infer<typeof exportJobDocSchema>;
export declare const exportArtifactPayloadSchema: z.ZodObject<{
    schemaVersion: z.ZodNumber;
    kind: z.ZodString;
    uid: z.ZodString;
    requestId: z.ZodString;
    requestedAt: z.ZodNullable<z.ZodString>;
    generatedAt: z.ZodString;
    data: z.ZodObject<{
        profile: z.ZodOptional<z.ZodUnknown>;
        collections: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    }, "strip", z.ZodTypeAny, {
        collections: Record<string, Record<string, unknown>[]>;
        profile?: unknown;
    }, {
        collections: Record<string, Record<string, unknown>[]>;
        profile?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    kind: string;
    requestId: string;
    schemaVersion: number;
    uid: string;
    requestedAt: string | null;
    generatedAt: string;
    data: {
        collections: Record<string, Record<string, unknown>[]>;
        profile?: unknown;
    };
}, {
    kind: string;
    requestId: string;
    schemaVersion: number;
    uid: string;
    requestedAt: string | null;
    generatedAt: string;
    data: {
        collections: Record<string, Record<string, unknown>[]>;
        profile?: unknown;
    };
}>;
export type ExportArtifactPayload = z.infer<typeof exportArtifactPayloadSchema>;
//# sourceMappingURL=export.d.ts.map