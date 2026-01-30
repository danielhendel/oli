// services/api/src/types/sources.ts
import { z } from "zod";

import { rawEventKindSchema, rawEventProviderSchema, rawEventSchemaVersionSchema } from "./events";

/**
 * ==========================================================================
 * Phase 1 — Source Registry Contract (AUTHORITATIVE)
 * ==========================================================================
 *
 * This module is the SINGLE SOURCE OF TRUTH for:
 * - which ingestion actors can exist for Phase 1
 * - which ingestible kinds + schema versions they may claim
 *
 * IMPORTANT:
 * - Source capabilities are ENFORCED server-side.
 * - Clients must never be able to create/modify sources via Firestore direct writes.
 *
 * PHASE 1 SCOPE:
 * - Only source types that correspond to existing ingestion surfaces are permitted.
 *   (api, upload)
 * - Backfill ingestion mechanics are Step 5 (explicitly out of scope).
 */

export const sourceTypeSchema = z.enum(["api", "upload"]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

// Upload ingestion writes a RawEvent (memory entry) with kind "file".
export const uploadKindSchema = z.literal("file");
export type UploadKind = z.infer<typeof uploadKindSchema>;

// All ingestible kinds in Phase 1.
export const ingestibleKindSchema = z.union([rawEventKindSchema, uploadKindSchema]);
export type IngestibleKind = z.infer<typeof ingestibleKindSchema>;

// Phase 1 supported schema versions.
export const supportedSchemaVersionSchema = rawEventSchemaVersionSchema;
export type SupportedSchemaVersion = z.infer<typeof supportedSchemaVersionSchema>;

/**
 * Code-defined capability matrix.
 *
 * Sources created via API must declare capabilities that are a SUBSET of one
 * of these supported declarations.
 */
export const supportedSourceDeclarationSchema = z.discriminatedUnion("sourceType", [
  z.object({
    provider: rawEventProviderSchema, // Phase 1: manual
    sourceType: z.literal("api"),
    allowedKinds: z.array(rawEventKindSchema).min(1),
    supportedSchemaVersions: z.array(supportedSchemaVersionSchema).min(1),
  }),
  z.object({
    provider: rawEventProviderSchema, // Phase 1: manual
    sourceType: z.literal("upload"),
    allowedKinds: z.array(uploadKindSchema).min(1),
    supportedSchemaVersions: z.array(supportedSchemaVersionSchema).min(1),
  }),
]);

export function validateSourceDeclarationSubset(args: {
  provider: z.infer<typeof rawEventProviderSchema>;
  sourceType: SourceType;
  allowedKinds: readonly IngestibleKind[];
  supportedSchemaVersions: readonly SupportedSchemaVersion[];
}): { ok: true } | { ok: false; details: unknown } {
  const attempt = supportedSourceDeclarationSchema.safeParse({
    provider: args.provider,
    sourceType: args.sourceType,
    allowedKinds: args.allowedKinds,
    supportedSchemaVersions: args.supportedSchemaVersions,
  });
  if (!attempt.success) {
    return { ok: false, details: attempt.error.flatten() };
  }
  return { ok: true };
}

export const sourceDocSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),

    provider: rawEventProviderSchema,
    sourceType: sourceTypeSchema,

    isActive: z.boolean(),

    allowedKinds: z.array(ingestibleKindSchema),
    supportedSchemaVersions: z.array(supportedSchemaVersionSchema),

    // Metadata only (never trusted for enforcement)
    capabilities: z.record(z.string(), z.unknown()).optional(),

    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type SourceDoc = z.infer<typeof sourceDocSchema>;

export const createSourceBodySchema = z
  .object({
    provider: rawEventProviderSchema,
    sourceType: sourceTypeSchema,

    isActive: z.boolean().optional().default(true),

    allowedKinds: z.array(ingestibleKindSchema).min(1),
    supportedSchemaVersions: z.array(supportedSchemaVersionSchema).min(1),

    capabilities: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CreateSourceBody = z.infer<typeof createSourceBodySchema>;

export const patchSourceBodySchema = z
  .object({
    isActive: z.boolean().optional(),
    allowedKinds: z.array(ingestibleKindSchema).min(1).optional(),
    supportedSchemaVersions: z.array(supportedSchemaVersionSchema).min(1).optional(),
    capabilities: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type PatchSourceBody = z.infer<typeof patchSourceBodySchema>;
