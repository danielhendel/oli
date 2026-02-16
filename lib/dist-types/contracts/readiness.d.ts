/**
 * Phase 1 Lock #3 — Canonical readiness vocabulary.
 *
 * The readiness vocabulary is exactly: missing | partial | ready | error
 *
 * All readiness-producing code MUST use these values. No drift.
 * CI blocks: loading, empty, invalid, not-ready, unknown, unready, pending, coming_soon.
 */
import { z } from "zod";
export declare const readinessSchema: z.ZodEnum<["missing", "partial", "ready", "error"]>;
export type Readiness = z.infer<typeof readinessSchema>;
export declare const CANONICAL_READINESS_VALUES: readonly Readiness[];
export declare const DISALLOWED_READINESS_STRINGS: readonly ["loading", "empty", "invalid", "not-ready", "unknown", "unready", "pending", "coming_soon"];
//# sourceMappingURL=readiness.d.ts.map