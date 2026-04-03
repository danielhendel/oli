import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform } from "react-native";
import {
  getBodyCompositionReadAuthStatus,
  requestPermissions,
} from "@/lib/integrations/appleHealth";
import type { WeightSeriesViewModel } from "@/lib/data/useWeightSeries";
import type { BodyMetricTrendsState } from "@/lib/data/body/useBodyMetricTrends";
import {
  countAnyBodyMetricPoints,
  deriveAppleHealthBodyUxPhase,
  mapReadStatusesToSnapshot,
  type AppleHealthBodyUxPhase,
  type BodyCompositionReadAuthSnapshot,
} from "@/lib/data/body/appleHealthBodyUxPhase";
import { filterToAppleHealthBodyReadSources } from "@/lib/data/body/sourceFiltering";

type SeriesState =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: string }
  | { status: "ready"; data: WeightSeriesViewModel };

export function useAppleHealthBodyAccessState(opts: {
  syncAppleHealthBodyNow: () => Promise<void>;
  series: SeriesState;
  /** Omitted when the screen does not load full trends (Body overview). */
  trends?: BodyMetricTrendsState;
  /** Default true. When false, phase logic does not wait on `trends`. */
  observeTrends?: boolean;
  /** Overview single-page probe; omit when not used (not pending). */
  overviewProbe?: { status: "partial" | "ready" | "error" };
  /** True when overview peek finished with at least one Apple Health row (composition-only users). */
  overviewPeekHasSamples?: boolean;
  isBodySyncing: boolean;
  isBackfillRunning: boolean;
  hasHealthKitBodyPipelineEvidence: boolean;
}): {
  phase: AppleHealthBodyUxPhase;
  authSnapshot: BodyCompositionReadAuthSnapshot | null;
  authLoading: boolean;
  refreshAuth: () => Promise<void>;
  onAllowAppleHealthBodyAccess: () => Promise<void>;
  onOpenAppSettings: () => void;
} {
  const [authSnapshot, setAuthSnapshot] = useState<BodyCompositionReadAuthSnapshot | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    if (Platform.OS !== "ios") {
      setAuthSnapshot({ kind: "unavailable" });
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);
    try {
      const res = await getBodyCompositionReadAuthStatus();
      if (!res.ok) {
        setAuthSnapshot({ kind: "unavailable", error: res.error });
      } else {
        setAuthSnapshot(mapReadStatusesToSnapshot(res.readStatuses));
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const onAllowAppleHealthBodyAccess = useCallback(async () => {
    const perm = await requestPermissions();
    await refreshAuth();
    if (perm.ok) {
      await opts.syncAppleHealthBodyNow();
    }
  }, [refreshAuth, opts.syncAppleHealthBodyNow]);

  const onOpenAppSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const phase = useMemo(() => {
    const observeTrends = opts.observeTrends !== false;
    const trends = opts.trends;
    const trendsReady = !observeTrends || trends?.status === "ready";
    const overviewProbePending = opts.overviewProbe?.status === "partial";

    return deriveAppleHealthBodyUxPhase({
      platform: Platform.OS,
      authSnapshot,
      authLoading,
      isBodySyncing: opts.isBodySyncing,
      isBackfillRunning: opts.isBackfillRunning,
      seriesReady: opts.series.status === "ready",
      trendsReady,
      observeTrends,
      overviewProbePending,
      hasAnyBodySampleInOli:
        (trends?.status === "ready" && countAnyBodyMetricPoints(trends.data.byMetric) > 0) ||
        (opts.series.status === "ready" &&
          filterToAppleHealthBodyReadSources(opts.series.data.points).length > 0) ||
        opts.overviewPeekHasSamples === true,
      hasHealthKitBodyPipelineEvidence: opts.hasHealthKitBodyPipelineEvidence,
    });
  }, [
    authSnapshot,
    authLoading,
    opts.isBodySyncing,
    opts.isBackfillRunning,
    opts.series,
    opts.series.status,
    opts.trends,
    opts.observeTrends,
    opts.overviewProbe,
    opts.overviewPeekHasSamples,
    opts.hasHealthKitBodyPipelineEvidence,
  ]);

  return {
    phase,
    authSnapshot,
    authLoading,
    refreshAuth,
    onAllowAppleHealthBodyAccess,
    onOpenAppSettings,
  };
}
