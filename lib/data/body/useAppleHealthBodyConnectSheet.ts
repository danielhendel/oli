/**
 * Orchestrates metric-specific Body Apple Health connect sheets.
 * Each card opens the same sheet configured for one metric.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";

import {
  connectAppleHealthBodyMetricForComposition,
  resumeAppleHealthBodyHistoryImport,
  syncAppleHealthBodyLatestForComposition,
  type AppleHealthBodyCompositionConnectPhase,
} from "@/lib/data/body/connectAppleHealthBodyForComposition";
import type { AppleHealthBodyConnectSheetPhase } from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import {
  resolveBodyMetricAppleHealthCardAction,
  resolveBodyMetricHistoryLabel,
  type BodyMetricAppleHealthStatus,
} from "@/lib/body/presentation/resolveBodyMetricAppleHealthCardAction";
import {
  BODY_APPLE_HEALTH_METRIC_REGISTRY,
  getBodyAppleHealthMetricDefinition,
  type BodyAppleHealthMetricId,
} from "@/lib/body/presentation/bodyAppleHealthMetricRegistry";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getAppleHealthBodyBackfillState,
  getAppleHealthConnected,
  getAppleHealthMetricLastCheckedMap,
  isAppleHealthDomainEnabled,
  type AppleHealthBodyBackfillStatus,
} from "@/lib/integrations/appleHealth/storage";
import {
  resolveBodyMetricSyncFlags,
  setAppleHealthMetricSyncEnabled,
  type BodyMetricSyncFlags,
} from "@/lib/integrations/appleHealth/appleHealthMetricSyncController";
import {
  requestAppleHealthReadPermissions,
} from "@/lib/integrations/appleHealth";

export type UseAppleHealthBodyConnectSheetArgs = {
  accessPhase: string;
  onDataMaybeChanged: () => void;
  refreshAccess: () => Promise<void>;
};

const EMPTY_FLAGS: BodyMetricSyncFlags = {
  weight: false,
  bodyFat: false,
  leanTissue: false,
};

/**
 * Metric-specific Apple Health sheet controller.
 */
export function useAppleHealthBodyConnectSheet(args: UseAppleHealthBodyConnectSheetArgs) {
  const { accessPhase, onDataMaybeChanged, refreshAccess } = args;
  const { user, getIdToken } = useAuth();
  const netInfo = useNetInfo();
  const uid = user?.uid;
  const [visible, setVisible] = useState(false);
  const [activeMetric, setActiveMetric] = useState<BodyAppleHealthMetricId | null>(null);
  const [phase, setPhase] = useState<AppleHealthBodyConnectSheetPhase>("explaining");
  const [historyAttention, setHistoryAttention] = useState(false);
  const [domainBackfillStatus, setDomainBackfillStatus] =
    useState<AppleHealthBodyBackfillStatus | null>(null);
  const [metricLastChecked, setMetricLastChecked] = useState<
    Partial<Record<BodyAppleHealthMetricId, string | null>>
  >({});
  const [sourceConnected, setSourceConnected] = useState(false);
  const [scopesLoaded, setScopesLoaded] = useState(false);
  const [metricSync, setMetricSync] = useState<BodyMetricSyncFlags>(EMPTY_FLAGS);
  const [connectingMetric, setConnectingMetric] = useState<BodyAppleHealthMetricId | null>(null);
  const inFlight = useRef(false);
  const activeUid = useRef<string | undefined>(uid);
  const activeMetricRef = useRef<BodyAppleHealthMetricId | null>(null);
  const onDataRef = useRef(onDataMaybeChanged);
  const refreshAccessRef = useRef(refreshAccess);
  onDataRef.current = onDataMaybeChanged;
  refreshAccessRef.current = refreshAccess;
  activeMetricRef.current = activeMetric;

  const resetForUid = useCallback(() => {
    inFlight.current = false;
    setVisible(false);
    setActiveMetric(null);
    setPhase("explaining");
    setHistoryAttention(false);
    setDomainBackfillStatus(null);
    setMetricLastChecked({});
    setSourceConnected(false);
    setScopesLoaded(false);
    setMetricSync(EMPTY_FLAGS);
    setConnectingMetric(null);
  }, []);

  useEffect(() => {
    if (activeUid.current !== uid) {
      resetForUid();
      activeUid.current = uid;
    }
  }, [uid, resetForUid]);

  const refreshScopeState = useCallback(async () => {
    if (!uid) {
      setScopesLoaded(true);
      setMetricSync(EMPTY_FLAGS);
      setSourceConnected(false);
      return;
    }
    const [connected, bodyEnabled, flags, backfill, lastMap] = await Promise.all([
      getAppleHealthConnected().catch(() => false),
      isAppleHealthDomainEnabled("body").catch(() => false),
      resolveBodyMetricSyncFlags(uid).catch(() => EMPTY_FLAGS),
      getAppleHealthBodyBackfillState().catch(() => null),
      getAppleHealthMetricLastCheckedMap(uid).catch(() => null),
    ]);
    if (activeUid.current !== uid) return;
    setSourceConnected(connected === true && bodyEnabled === true);
    setMetricSync(flags);
    setScopesLoaded(true);
    setDomainBackfillStatus(backfill?.status ?? null);
    if (backfill?.status === "failed") setHistoryAttention(true);
    setMetricLastChecked({
      weight: lastMap?.metrics.weight ?? null,
      bodyFat: lastMap?.metrics.bodyFat ?? null,
      leanTissue: lastMap?.metrics.leanTissue ?? null,
    });
  }, [uid]);

  useEffect(() => {
    void refreshScopeState();
  }, [refreshScopeState]);

  const cardActionsByMetric = useMemo(() => {
    const out = {} as Record<BodyAppleHealthMetricId, BodyMetricAppleHealthStatus>;
    for (const def of BODY_APPLE_HEALTH_METRIC_REGISTRY) {
      out[def.id] = resolveBodyMetricAppleHealthCardAction({
        metricId: def.id,
        sourceConnected,
        metricScopeOn: metricSync[def.id] === true,
        scopesLoaded,
        connecting: connectingMetric === def.id,
        needsAttention: accessPhase === "denied" || phase === "needsReview",
      });
    }
    return out;
  }, [sourceConnected, metricSync, scopesLoaded, connectingMetric, accessPhase, phase]);

  const openForMetric = useCallback(
    (metricId: BodyAppleHealthMetricId) => {
      setActiveMetric(metricId);
      activeMetricRef.current = metricId;
      void refreshScopeState();
      const status = resolveBodyMetricAppleHealthCardAction({
        metricId,
        sourceConnected,
        metricScopeOn: metricSync[metricId] === true,
        scopesLoaded,
        connecting: connectingMetric === metricId,
        needsAttention: accessPhase === "denied",
      });
      if (status.kind === "sync_now") {
        setPhase("explaining");
      } else if (status.kind === "review_access") {
        setPhase("needsReview");
      } else if (historyAttention && metricSync[metricId]) {
        setPhase("historyIncomplete");
      } else {
        setPhase("connectedStatus");
      }
      setVisible(true);
    },
    [
      refreshScopeState,
      sourceConnected,
      metricSync,
      scopesLoaded,
      connectingMetric,
      accessPhase,
      historyAttention,
    ],
  );

  const close = useCallback(() => {
    setVisible(false);
    setActiveMetric(null);
    activeMetricRef.current = null;
  }, []);

  const runConnectMetric = useCallback(
    async (metricId: BodyAppleHealthMetricId) => {
      if (inFlight.current) return;
      if (!uid) {
        setPhase("failed");
        return;
      }
      if (netInfo.isConnected === false) {
        setPhase("waitingForNetwork");
        return;
      }
      inFlight.current = true;
      setConnectingMetric(metricId);
      try {
        const result = await connectAppleHealthBodyMetricForComposition({
          getIdToken,
          uid,
          metricId,
          onPhase: (p: AppleHealthBodyCompositionConnectPhase) => {
            if (activeUid.current !== uid) return;
            if (activeMetricRef.current !== metricId) return;
            setPhase(p);
          },
          onLatestSynced: () => {
            if (activeUid.current !== uid) return;
            onDataRef.current();
          },
        });
        if (activeUid.current !== uid) return;
        await refreshAccessRef.current();
        await refreshScopeState();
        if (!result.ok) {
          if (result.reason === "permission_denied") {
            setPhase("needsReview");
            setMetricSync((prev) => ({ ...prev, [metricId]: false }));
          } else {
            setPhase("failed");
          }
          return;
        }
        setHistoryAttention(result.historyState === "failed" || result.historyState === "partial");
        setPhase(
          result.phase === "connectedNoData" || result.phase === "upToDate"
            ? "connectedStatus"
            : result.phase,
        );
        onDataRef.current();
      } catch {
        if (activeUid.current === uid) setPhase("failed");
      } finally {
        inFlight.current = false;
        setConnectingMetric(null);
      }
    },
    [uid, getIdToken, netInfo.isConnected, refreshScopeState],
  );

  const onToggleMetricSync = useCallback(
    async (metricId: BodyAppleHealthMetricId, enabled: boolean) => {
      if (!uid || activeUid.current !== uid) return;
      if (inFlight.current) return;

      if (!enabled) {
        const previous = metricSync[metricId];
        setMetricSync((prev) => ({ ...prev, [metricId]: false }));
        const result = await setAppleHealthMetricSyncEnabled({
          uid,
          metricId,
          enabled: false,
        });
        if (!result.ok) {
          setMetricSync((prev) => ({ ...prev, [metricId]: previous }));
          return;
        }
        await refreshScopeState();
        return;
      }

      // Turning ON
      if (!sourceConnected) {
        setPhase("explaining");
        return;
      }

      inFlight.current = true;
      setConnectingMetric(metricId);
      const previous = metricSync[metricId];
      setMetricSync((prev) => ({ ...prev, [metricId]: true }));
      try {
        const def = getBodyAppleHealthMetricDefinition(metricId);
        const perm = await requestAppleHealthReadPermissions([def.appleHealthReadType]);
        if (!perm.ok) {
          setMetricSync((prev) => ({ ...prev, [metricId]: previous }));
          setPhase("needsReview");
          return;
        }
        const scopeResult = await setAppleHealthMetricSyncEnabled({
          uid,
          metricId,
          enabled: true,
        });
        if (!scopeResult.ok) {
          setMetricSync((prev) => ({ ...prev, [metricId]: previous }));
          return;
        }
        const sync = await syncAppleHealthBodyLatestForComposition(
          { getIdToken, uid, onLatestSynced: () => onDataRef.current() },
          { trigger: "body_page_pull_refresh", metricId },
        );
        if (!sync.ok && activeUid.current === uid) {
          // Remain ON — safe retry state; do not delete data.
          setPhase("connectedStatus");
        }
        if (
          historyAttention &&
          domainBackfillStatus === "failed" &&
          activeUid.current === uid
        ) {
          void resumeAppleHealthBodyHistoryImport({
            getIdToken,
            uid,
            onPhase: () => undefined,
            onLatestSynced: () => onDataRef.current(),
          });
        }
        await refreshScopeState();
        onDataRef.current();
      } catch {
        setMetricSync((prev) => ({ ...prev, [metricId]: previous }));
      } finally {
        inFlight.current = false;
        setConnectingMetric(null);
      }
    },
    [
      uid,
      metricSync,
      sourceConnected,
      getIdToken,
      refreshScopeState,
      historyAttention,
      domainBackfillStatus,
    ],
  );

  const onPrimary = useCallback(() => {
    const metricId = activeMetric;
    if (!metricId) {
      close();
      return;
    }
    if (phase === "explaining" || phase === "failed") {
      void runConnectMetric(metricId);
      return;
    }
    if (phase === "historyIncomplete" || phase === "waitingForNetwork") {
      void resumeAppleHealthBodyHistoryImport({
        getIdToken,
        ...(uid ? { uid } : {}),
        onPhase: (p) => {
          if (activeUid.current !== uid) return;
          if (activeMetricRef.current !== metricId) return;
          setPhase(p);
        },
        onLatestSynced: () => onDataRef.current(),
      });
      return;
    }
    if (phase === "needsReview") {
      void Linking.openSettings();
      return;
    }
    close();
  }, [activeMetric, phase, runConnectMetric, close, getIdToken, uid]);

  const onPressCardConnection = useCallback(
    (metricId: BodyAppleHealthMetricId) => {
      openForMetric(metricId);
    },
    [openForMetric],
  );

  const activeMetricScopeOn =
    activeMetric != null ? metricSync[activeMetric] === true : false;

  const activeHistoryLabel =
    activeMetric != null
      ? resolveBodyMetricHistoryLabel({
          metricScopeOn: activeMetricScopeOn,
          domainBackfillStatus,
        })
      : "Not yet";

  const activeLastCheckedIso =
    activeMetric != null ? (metricLastChecked[activeMetric] ?? null) : null;

  const activeStatus =
    activeMetric != null
      ? cardActionsByMetric[activeMetric]
      : null;

  return {
    visible,
    activeMetric,
    phase,
    historyAttention,
    lastSuccessfulSyncAtIso: activeLastCheckedIso,
    historyLabel: activeHistoryLabel,
    statusChipLabel: activeStatus?.chipLabel ?? null,
    bodyScopeConnected: sourceConnected,
    scopesLoaded,
    metricSync,
    cardActionsByMetric,
    openForMetric,
    close,
    onPrimary,
    onPressCardConnection,
    onToggleMetricSync,
    refreshLastUpdatedFromStorage: refreshScopeState,
  };
}
