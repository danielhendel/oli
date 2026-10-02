/**
 * Data-layer composition hook for Canonical Body Composition Evidence.
 *
 * Computes canonical evidence from caller-provided continuous/scan sources plus
 * governed profile context. This is NOT an account-wide evidence-fetching hook —
 * completeness is always caller_supplied_partial.
 *
 * No Firebase, no new endpoint, no consumer UI.
 */

import { useMemo } from "react";

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceCompleteness,
  BodyScanDetailDto,
} from "@oli/contracts";

import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";

import { buildBodyCompositionEvidenceBundle } from "./buildBodyCompositionEvidenceBundle";
import type { ContinuousBodyEvidenceEventInput } from "./continuousEvidenceAdapter";

export type UseBodyCompositionEvidenceArgs = {
  enabled?: boolean;
  /**
   * Omitted vs `[]` vs nonempty are distinct completeness states.
   * Do not collapse omission with empty before calling the builder.
   */
  continuousEvents?: readonly ContinuousBodyEvidenceEventInput[];
  /**
   * Verified scan detail DTOs (metrics included).
   * List endpoints alone cannot populate scan observations.
   * Supplying some scans does not prove all-account scan coverage.
   */
  verifiedScanDetails?: readonly BodyScanDetailDto[];
  profileEffectiveAt?: string | null;
};

export type UseBodyCompositionEvidenceResult = {
  /**
   * Lifecycle status of the hook computation — not evidence coverage.
   * `partial` = profile/auth still loading; `ready` = bridge computed from provided inputs.
   */
  status: "partial" | "ready" | "error" | "missing";
  bundle: BodyCompositionEvidenceBundle | null;
  /** Present on every successful (`ready`) result; mirrors bundle.completeness. */
  completeness: BodyCompositionEvidenceCompleteness | null;
  error: string | null;
};

export function useBodyCompositionEvidence(
  args: UseBodyCompositionEvidenceArgs = {},
): UseBodyCompositionEvidenceResult {
  const enabled = args.enabled !== false;
  const { state: profileState } = useUserProfileMain();

  return useMemo(() => {
    if (!enabled) {
      return { status: "partial", bundle: null, completeness: null, error: null };
    }
    if (profileState.status === "missing") {
      return { status: "missing", bundle: null, completeness: null, error: null };
    }
    if (profileState.status === "error") {
      return {
        status: "error",
        bundle: null,
        completeness: null,
        error: profileState.message,
      };
    }
    if (profileState.status === "partial") {
      return { status: "partial", bundle: null, completeness: null, error: null };
    }

    try {
      // Preserve omitted vs empty: pass properties only when present on args.
      const bundle = buildBodyCompositionEvidenceBundle({
        ...(args.continuousEvents !== undefined
          ? { continuousEvents: args.continuousEvents }
          : {}),
        ...(args.verifiedScanDetails !== undefined
          ? { verifiedBodyScans: args.verifiedScanDetails }
          : {}),
        profile: profileState.profile,
        profileEffectiveAt: args.profileEffectiveAt ?? null,
      });
      return {
        status: "ready",
        bundle,
        completeness: bundle.completeness,
        error: null,
      };
    } catch (e) {
      return {
        status: "error",
        bundle: null,
        completeness: null,
        error: e instanceof Error ? e.message : "Evidence bridge failed",
      };
    }
  }, [
    enabled,
    profileState,
    args.continuousEvents,
    args.verifiedScanDetails,
    args.profileEffectiveAt,
  ]);
}
