// /services/functions/src/normalization/normalizationVersions.ts
/**
 * Version constants for the normalization pipeline.
 *
 * These support the Reprocessing Engine and long-term compatibility:
 * - schemaVersion: Canonical Schema version used for the event
 * - canonicalVersion: pipeline version for RawEvent → CanonicalEvent mapping
 * - logicVersion: specific mapping logic variant
 *
 * See:
 * - Canonical Schema v1
 * - Architecture (v2) Versioning model
 * - ChatGPT Alignment v1.1 versioning rules
 */
export const CANONICAL_SCHEMA_VERSION = 1;
export const CANONICAL_PIPELINE_VERSION = 1;
export const NORMALIZATION_LOGIC_VERSION = 1;
