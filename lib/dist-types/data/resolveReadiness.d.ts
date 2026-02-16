export type NetworkStatus = "loading" | "ok" | "error";
/** Phase 1 Lock #3: Canonical readiness vocabulary. Use Readiness from @oli/contracts. */
export type ReadinessState = "missing" | "partial" | "ready" | "error";
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
    reason: "network-loading" | "network-error" | "no-events" | "invalid-payload" | "missing-meta" | "pipeline-version-mismatch" | "stale-derived" | "ready";
};
/**
 * Phase 1 §4.1: Fail-Closed Readiness Resolver
 *
 * The client must render nothing unless truth is provably valid.
 * This resolver is the single source of truth for readiness gating.
 */
export declare function resolveReadiness(input: ResolveReadinessInput): ReadinessResult;
//# sourceMappingURL=resolveReadiness.d.ts.map