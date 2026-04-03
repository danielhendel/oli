/** HealthKit authorizationStatusForType numeric codes from react-native-health (HealthStatusCode). */
export const HK_AUTH_NOT_DETERMINED = 0;
export const HK_AUTH_SHARING_DENIED = 1;
export const HK_AUTH_SHARING_AUTHORIZED = 2;

export type BodyCompositionReadAuthSnapshot =
  | { kind: "unavailable"; error?: string }
  | { kind: "not_determined" }
  | { kind: "denied" }
  | { kind: "authorized" };

export type AppleHealthBodyUxPhase =
  | "loading"
  | "unavailable"
  | "not_determined"
  | "denied"
  | "syncing"
  | "granted_no_data"
  | "ready";

export function mapAuthNumbersToSnapshot(bodyMassStatus: number | undefined): BodyCompositionReadAuthSnapshot {
  if (bodyMassStatus === undefined) return { kind: "unavailable" };
  return mapReadStatusesToSnapshot([bodyMassStatus]);
}

/**
 * Maps react-native-health `getAuthStatus` read codes for Body composition types.
 * Uses the full vector: **any** type authorized ⇒ access for Body UX; **all** known types denied ⇒ denied.
 * Avoids a single-type (e.g. BodyMass-only) false negative when another type still reports denied or HK order differs.
 */
export function mapReadStatusesToSnapshot(readStatuses: number[] | undefined): BodyCompositionReadAuthSnapshot {
  if (!readStatuses?.length) return { kind: "unavailable" };

  const known: number[] = [];
  for (const s of readStatuses) {
    if (s === HK_AUTH_NOT_DETERMINED || s === HK_AUTH_SHARING_DENIED || s === HK_AUTH_SHARING_AUTHORIZED) {
      known.push(s);
    }
  }
  if (known.length === 0) return { kind: "unavailable" };
  if (known.some((s) => s === HK_AUTH_SHARING_AUTHORIZED)) return { kind: "authorized" };
  if (known.every((s) => s === HK_AUTH_SHARING_DENIED)) return { kind: "denied" };
  if (known.some((s) => s === HK_AUTH_NOT_DETERMINED)) return { kind: "not_determined" };
  return { kind: "unavailable" };
}

/**
 * Derives Body overview UX phase from HealthKit auth, sync activity, and whether Oli has any body raw points.
 * Pure — no I/O; screens consume via useAppleHealthBodyAccessState.
 *
 * Precedence (stale-while-revalidate: data / pipeline over transient auth + background sync):
 * 1. Non‑iOS → unavailable
 * 2. Weight series ready and Oli has body samples → ready (background sync does not downgrade to syncing/connect)
 * 3. Sync or backfill running → syncing (only when not already showing data in step 2)
 * 4. HealthKit body pipeline succeeded (session or persisted storage) → wait for series + overview probe (and trends when observed),
 *    then granted_no_data if still empty; never surface connect/denied while pipeline proves reads+ingest worked.
 * 5. Auth still loading → loading
 * 6. Auth probe unavailable → unavailable
 * 7. Before persisted hydration finishes on iOS, not_determined/denied → loading (avoids connect flicker while AsyncStorage loads)
 * 8. not_determined / denied (first-run or revoked) when hydrated and no pipeline evidence
 * 9. Otherwise loading until series+trends ready, then granted_no_data or ready
 */
export function deriveAppleHealthBodyUxPhase(input: {
  platform: string;
  authSnapshot: BodyCompositionReadAuthSnapshot | null;
  authLoading: boolean;
  isBodySyncing: boolean;
  isBackfillRunning: boolean;
  seriesReady: boolean;
  trendsReady: boolean;
  /** When false, full multi-metric trends are not loaded (e.g. Body overview); do not block on trends. */
  observeTrends: boolean;
  /** Single-page overview raw-events probe; when pending, pipeline gate waits. */
  overviewProbePending: boolean;
  hasAnyBodySampleInOli: boolean;
  /** True after successful sync this session, completed backfill this session, or persisted pipeline markers from storage. */
  hasHealthKitBodyPipelineEvidence: boolean;
  /**
   * False only briefly on iOS while reading AsyncStorage for prior pipeline evidence.
   * When false, suppress not_determined/denied so the connect card does not flash on warm load.
   */
  persistedPipelineEvidenceHydrated: boolean;
}): AppleHealthBodyUxPhase {
  if (input.platform !== "ios") return "unavailable";

  if (input.seriesReady && input.hasAnyBodySampleInOli) return "ready";

  if (input.isBodySyncing || input.isBackfillRunning) return "syncing";

  if (input.hasHealthKitBodyPipelineEvidence) {
    if (!input.seriesReady || input.overviewProbePending) return "loading";
    if (input.observeTrends && !input.trendsReady) return "loading";
    if (input.hasAnyBodySampleInOli) return "ready";
    return "granted_no_data";
  }

  if (input.authLoading || input.authSnapshot === null) return "loading";

  const snap = input.authSnapshot;
  if (snap.kind === "unavailable") return "unavailable";

  if (!input.persistedPipelineEvidenceHydrated) {
    if (snap.kind === "not_determined" || snap.kind === "denied") return "loading";
  }

  if (snap.kind === "not_determined") return "not_determined";
  if (snap.kind === "denied") return "denied";

  if (!input.seriesReady || (input.observeTrends && !input.trendsReady)) return "loading";
  if (!input.hasAnyBodySampleInOli) return "granted_no_data";
  return "ready";
}

export function countAnyBodyMetricPoints(byMetric: {
  weight: unknown[];
  body_fat_percent: unknown[];
  bmi: unknown[];
  lean_body_mass: unknown[];
  resting_metabolic_rate: unknown[];
}): number {
  return (
    byMetric.weight.length +
    byMetric.body_fat_percent.length +
    byMetric.bmi.length +
    byMetric.lean_body_mass.length +
    byMetric.resting_metabolic_rate.length
  );
}
