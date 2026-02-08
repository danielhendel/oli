// lib/data/resolveReadiness.ts
import { isCompatiblePipelineVersion, isFreshComputedAt } from "@/lib/data/readiness";

export type NetworkStatus = "loading" | "ok" | "error";

export type ReadinessState = "loading" | "empty" | "invalid" | "partial" | "ready";

export type ResolveReadinessInput = {
  network: NetworkStatus;
  /** True only when the backing payload has been schema-validated (e.g., zod parse succeeded). */
  zodValid: boolean;
  /** Canonical events count for the day (authoritative DayIndex surface). */
  eventsCount: number | null;
  computedAtIso: string | null;
  latestCanonicalEventAtIso: string | null;
  pipelineVersion: number | null;
  expectedPipelineVersion: number;
};

export type ReadinessResult = {
  state: ReadinessState;
  /** Stable, human-readable reason that can be surfaced in the UI (no dev tools required). */
  reason:
    | "network-loading"
    | "network-error"
    | "no-events"
    | "invalid-payload"
    | "missing-meta"
    | "pipeline-version-mismatch"
    | "stale-derived"
    | "ready";
};

/**
 * Phase 1 §4.1: Fail-Closed Readiness Resolver
 *
 * The client must render nothing unless truth is provably valid.
 * This resolver is the single source of truth for readiness gating.
 */
export function resolveReadiness(input: ResolveReadinessInput): ReadinessResult {
  if (input.network === "loading") return { state: "loading", reason: "network-loading" };
  if (input.network === "error") return { state: "invalid", reason: "network-error" };

  // network === "ok"
  // Sprint 0 Option A: fact-only days (eventsCount=0) can have derived truth via facts/context.
  // Only treat as empty when we have neither events nor computedAt.
  if (input.eventsCount === 0 && !input.computedAtIso) return { state: "empty", reason: "no-events" };
  if (input.eventsCount === null) return { state: "loading", reason: "network-loading" };

  // If events or derived truth exist, schema must be valid.
  if (!input.zodValid) return { state: "partial", reason: "invalid-payload" };

  // Derived truth must expose its meta surface.
  // For fact-only days (eventsCount=0), computedAt is sufficient; latestCanonicalEventAt is optional.
  if (!input.computedAtIso) return { state: "partial", reason: "missing-meta" };
  if (input.eventsCount > 0 && !input.latestCanonicalEventAtIso) {
    return { state: "partial", reason: "missing-meta" };
  }

  const versionOk = isCompatiblePipelineVersion({
    pipelineVersion: input.pipelineVersion,
    expectedPipelineVersion: input.expectedPipelineVersion,
  });
  if (!versionOk) return { state: "invalid", reason: "pipeline-version-mismatch" };

  const fresh = isFreshComputedAt({
    computedAtIso: input.computedAtIso,
    latestEventAtIso: input.latestCanonicalEventAtIso,
  });
  if (!fresh) return { state: "partial", reason: "stale-derived" };

  return { state: "ready", reason: "ready" };
}