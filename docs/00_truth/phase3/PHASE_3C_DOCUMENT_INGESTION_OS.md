/**
 * Phase 3C — Document Ingestion OS (binding summary).
 *
 * Full implementation lives in code. This note records the phase boundary.
 *
 * Hierarchy preserved: RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext
 * Document OS sits before canonicalization: upload → store → classify → extract (staging) → review.
 *
 * Ownership hardening (application architecture):
 * - Storage Model A: server-only Admin SDK; deny-all client Storage rules; no public file URLs.
 * - Upload transport: base64 JSON bridge (5 MiB) — staging bridge for Labs PDF only; not production streaming.
 * - Upload domains enabled: labs. Deferred: scans, medical_history, dna, medications, supplements, other.
 * - Account export: safe document/lab metadata + packageRelativePath relationships (binaries not embedded).
 * - Account delete: Storage prefixes first (fail closed on partial failure), then Firestore document collections.
 *
 * Does NOT: invent biomarkers, canonicalize extraction, implement Labs OS / DEXA / DNA interpretation.
 */

export {};
