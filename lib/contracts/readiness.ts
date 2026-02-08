/**
 * Phase 1 Lock #3 — Canonical readiness vocabulary.
 *
 * The readiness vocabulary is exactly: missing | partial | ready | error
 *
 * All readiness-producing code MUST use these values. No drift.
 * CI blocks: loading, empty, invalid, not-ready, unknown, unready, pending, coming_soon.
 */
import { z } from "zod";

export const readinessSchema = z.enum(["missing", "partial", "ready", "error"]);
export type Readiness = z.infer<typeof readinessSchema>;

export const CANONICAL_READINESS_VALUES: readonly Readiness[] = ["missing", "partial", "ready", "error"];

export const DISALLOWED_READINESS_STRINGS = [
  "loading",
  "empty",
  "invalid",
  "not-ready",
  "unknown",
  "unready",
  "pending",
  "coming_soon",
] as const;
