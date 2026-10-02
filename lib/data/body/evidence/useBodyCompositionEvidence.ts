/**
 * Data-layer composition hook for Canonical Body Composition Evidence.
 * Composes existing profile context + caller-supplied continuous/scan inputs.
 * No Firebase, no new endpoint, no consumer UI.
 */

import { useMemo } from "react";

import type { BodyCompositionEvidenceBundle, BodyScanDetailDto } from "@oli/contracts";

import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";

import {
  buildBodyCompositionEvidenceBundle,
  type BuildBodyCompositionEvidenceBundleInput,
} from "./buildBodyCompositionEvidenceBundle";
import type { ContinuousBodyEvidenceEventInput } from "./continuousEvidenceAdapter";

export type UseBodyCompositionEvidenceArgs = {
  enabled?: boolean;
  continuousEvents?: readonly ContinuousBodyEvidenceEventInput[];
  /**
   * Verified scan detail DTOs (metrics included).
   * List endpoints alone cannot populate scan observations.
   */
  verifiedScanDetails?: readonly BodyScanDetailDto[];
  profileEffectiveAt?: string | null;
};

export type UseBodyCompositionEvidenceResult = {
  status: "partial" | "ready" | "error" | "missing";
  bundle: BodyCompositionEvidenceBundle | null;
  error: string | null;
};

export function useBodyCompositionEvidence(
  args: UseBodyCompositionEvidenceArgs = {},
): UseBodyCompositionEvidenceResult {
  const enabled = args.enabled !== false;
  const { state: profileState } = useUserProfileMain();

  return useMemo(() => {
    if (!enabled) {
      return { status: "partial", bundle: null, error: null };
    }
    if (profileState.status === "missing") {
      return { status: "missing", bundle: null, error: null };
    }
    if (profileState.status === "error") {
      return {
        status: "error",
        bundle: null,
        error: profileState.message,
      };
    }
    if (profileState.status === "partial") {
      return { status: "partial", bundle: null, error: null };
    }

    const input: BuildBodyCompositionEvidenceBundleInput = {
      continuousEvents: args.continuousEvents ?? [],
      verifiedBodyScans: args.verifiedScanDetails ?? [],
      profile: profileState.profile,
      profileEffectiveAt: args.profileEffectiveAt ?? null,
    };

    try {
      const bundle = buildBodyCompositionEvidenceBundle(input);
      return { status: "ready", bundle, error: null };
    } catch (e) {
      return {
        status: "error",
        bundle: null,
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
