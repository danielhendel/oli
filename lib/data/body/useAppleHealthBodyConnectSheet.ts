import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";

import {
  connectAppleHealthBodyForComposition,
  resumeAppleHealthBodyHistoryImport,
  type AppleHealthBodyCompositionConnectPhase,
} from "@/lib/data/body/connectAppleHealthBodyForComposition";
import {
  mapConnectPhaseToCardAction,
  type AppleHealthBodyConnectSheetPhase,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getAppleHealthBodyBackfillState,
  getAppleHealthBodyLastCheckedAt,
  isAppleHealthDomainEnabled,
} from "@/lib/integrations/appleHealth/storage";
import {
  resolveBodyMetricSyncFlags,
  setAppleHealthMetricSyncEnabled,
  type BodyMetricSyncFlags,
} from "@/lib/integrations/appleHealth/appleHealthMetricSyncController";
import type { AppleHealthMetricSyncId } from "@/lib/integrations/appleHealth/appleHealthMetricSyncScope";

export type UseAppleHealthBodyConnectSheetArgs = {
  accessPhase: string;
  onDataMaybeChanged: () => void;
  refreshAccess: () => Promise<void>;
};

/**
 * Orchestrates the in-context Body Apple Health connect sheet.
 * Status/management only — latest refresh is owned by the Body page.
 */
export function useAppleHealthBodyConnectSheet(args: UseAppleHealthBodyConnectSheetArgs) {
  const { accessPhase, onDataMaybeChanged, refreshAccess } = args;
  const { user, getIdToken } = useAuth();
  const netInfo = useNetInfo();
  const uid = user?.uid;
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<AppleHealthBodyConnectSheetPhase>("explaining");
  const [historyAttention, setHistoryAttention] = useState(false);
  const [lastSuccessfulSyncAtIso, setLastSuccessfulSyncAtIso] = useState<string | null>(null);
  const [bodyScopeConnected, setBodyScopeConnected] = useState(false);
  const [metricSync, setMetricSync] = useState<BodyMetricSyncFlags>({
    weight: true,
    bodyFat: true,
    leanTissue: true,
  });
  const inFlight = useRef(false);
  const activeUid = useRef<string | undefined>(uid);
  const onDataRef = useRef(onDataMaybeChanged);
  const refreshAccessRef = useRef(refreshAccess);
  onDataRef.current = onDataMaybeChanged;
  refreshAccessRef.current = refreshAccess;

  useEffect(() => {
    if (activeUid.current !== uid) {
      inFlight.current = false;
      setVisible(false);
      setPhase("explaining");
      setHistoryAttention(false);
      setLastSuccessfulSyncAtIso(null);
      setBodyScopeConnected(false);
      setMetricSync({ weight: true, bodyFat: true, leanTissue: true });
      activeUid.current = uid;
    }
  }, [uid]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [backfill, lastChecked, bodyEnabled] = await Promise.all([
        getAppleHealthBodyBackfillState().catch(() => null),
        getAppleHealthBodyLastCheckedAt().catch(() => null),
        isAppleHealthDomainEnabled("body").catch(() => false),
      ]);
      if (cancelled) return;
      if (lastChecked) setLastSuccessfulSyncAtIso(lastChecked);
      setBodyScopeConnected(bodyEnabled);
      if (uid) {
        const flags = await resolveBodyMetricSyncFlags(uid).catch(() => null);
        if (!cancelled && flags) setMetricSync(flags);
      }
      if (!backfill) return;
      if (backfill.status === "in_progress") {
        setPhase("importingEarlier");
        setHistoryAttention(true);
      } else if (backfill.status === "failed") {
        setPhase("historyIncomplete");
        setHistoryAttention(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const refreshLastUpdatedFromStorage = useCallback(async () => {
    const [lastChecked, bodyEnabled] = await Promise.all([
      getAppleHealthBodyLastCheckedAt().catch(() => null),
      isAppleHealthDomainEnabled("body").catch(() => false),
    ]);
    if (activeUid.current !== uid) return;
    if (lastChecked) setLastSuccessfulSyncAtIso(lastChecked);
    setBodyScopeConnected(bodyEnabled);
    if (uid) {
      const flags = await resolveBodyMetricSyncFlags(uid).catch(() => null);
      if (activeUid.current === uid && flags) setMetricSync(flags);
    }
  }, [uid]);

  const openForConnect = useCallback(() => {
    setPhase("explaining");
    setVisible(true);
  }, []);

  const openForStatus = useCallback(() => {
    void refreshLastUpdatedFromStorage();
    setPhase((current) => {
      if (
        current === "importingRecent" ||
        current === "importingEarlier" ||
        current === "findingLatest" ||
        current === "historyIncomplete" ||
        current === "waitingForNetwork" ||
        current === "failed"
      ) {
        return current;
      }
      if (historyAttention) return "historyIncomplete";
      return "connectedStatus";
    });
    setVisible(true);
  }, [historyAttention, refreshLastUpdatedFromStorage]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const runConnect = useCallback(async () => {
    if (inFlight.current) return;
    if (!uid) {
      setPhase("failed");
      return;
    }

    if (netInfo.isConnected === false) {
      setPhase("waitingForNetwork");
      setHistoryAttention(true);
      return;
    }

    inFlight.current = true;
    try {
      const result = await connectAppleHealthBodyForComposition({
        getIdToken,
        ...(uid ? { uid } : {}),
        onPhase: (p: AppleHealthBodyCompositionConnectPhase) => {
          if (activeUid.current !== uid) return;
          setPhase(p);
        },
        onLatestSynced: () => {
          if (activeUid.current !== uid) return;
          onDataRef.current();
        },
      });
      if (activeUid.current !== uid) return;
      await refreshAccessRef.current();
      if (!result.ok) {
        if (result.reason === "permission_denied") {
          setPhase("needsReview");
        } else {
          setPhase("failed");
        }
        return;
      }
      setPhase(result.phase);
      setHistoryAttention(result.historyState === "failed" || result.historyState === "partial");
      setBodyScopeConnected(true);
      await refreshLastUpdatedFromStorage();
      onDataRef.current();
    } catch {
      if (activeUid.current === uid) setPhase("failed");
    } finally {
      inFlight.current = false;
    }
  }, [uid, getIdToken, netInfo.isConnected, refreshLastUpdatedFromStorage]);

  const runResumeHistory = useCallback(async () => {
    if (inFlight.current) return;
    if (netInfo.isConnected === false) {
      setPhase("waitingForNetwork");
      return;
    }
    inFlight.current = true;
    try {
      const result = await resumeAppleHealthBodyHistoryImport({
        getIdToken,
        ...(uid ? { uid } : {}),
        onPhase: (p) => {
          if (activeUid.current !== uid) return;
          setPhase(p);
        },
        onLatestSynced: () => onDataRef.current(),
      });
      if (activeUid.current !== uid) return;
      if (!result.ok) {
        setPhase("historyIncomplete");
        setHistoryAttention(true);
        return;
      }
      setPhase(result.phase);
      setHistoryAttention(result.historyState !== "complete");
      await refreshAccessRef.current();
      onDataRef.current();
    } finally {
      inFlight.current = false;
    }
  }, [uid, getIdToken, netInfo.isConnected]);

  const onPrimary = useCallback(() => {
    if (phase === "explaining" || phase === "failed") {
      void runConnect();
      return;
    }
    if (phase === "historyIncomplete" || phase === "waitingForNetwork") {
      void runResumeHistory();
      return;
    }
    if (phase === "needsReview") {
      void Linking.openSettings();
      return;
    }
    if (
      phase === "upToDate" ||
      phase === "connectedNoData" ||
      phase === "connectedStatus"
    ) {
      close();
    }
  }, [phase, runConnect, runResumeHistory, close]);

  const transientImport =
    phase === "importingRecent" ||
    phase === "importingEarlier" ||
    phase === "findingLatest" ||
    phase === "requestingPermission";

  const cardAction = mapConnectPhaseToCardAction(
    transientImport ||
      phase === "historyIncomplete" ||
      phase === "waitingForNetwork" ||
      phase === "failed" ||
      phase === "needsReview"
      ? phase
      : "idle",
    accessPhase,
    historyAttention,
  );

  const onPressCardConnection = useCallback(() => {
    if (accessPhase === "denied" || phase === "needsReview") {
      setPhase("needsReview");
      setVisible(true);
      return;
    }
    if (
      accessPhase === "ready" ||
      accessPhase === "granted_no_data" ||
      phase === "upToDate" ||
      phase === "connectedNoData" ||
      phase === "connectedStatus" ||
      phase === "historyIncomplete" ||
      historyAttention
    ) {
      openForStatus();
      return;
    }
    if (
      phase === "importingRecent" ||
      phase === "importingEarlier" ||
      phase === "findingLatest" ||
      phase === "failed" ||
      phase === "waitingForNetwork"
    ) {
      setVisible(true);
      return;
    }
    openForConnect();
  }, [accessPhase, phase, historyAttention, openForConnect, openForStatus]);

  const onToggleMetricSync = useCallback(
    async (metricId: AppleHealthMetricSyncId, enabled: boolean) => {
      if (!uid || activeUid.current !== uid) return;
      // Optimistic UI
      setMetricSync((prev) => ({ ...prev, [metricId]: enabled }));
      const result = await setAppleHealthMetricSyncEnabled({ uid, metricId, enabled });
      if (result.ok === false || activeUid.current !== uid) {
        const flags = await resolveBodyMetricSyncFlags(uid).catch(() => null);
        if (flags && activeUid.current === uid) setMetricSync(flags);
        return;
      }
      const bodyEnabled = await isAppleHealthDomainEnabled("body").catch(() => false);
      if (activeUid.current === uid) setBodyScopeConnected(bodyEnabled);
    },
    [uid],
  );

  return {
    visible,
    phase,
    historyAttention,
    lastSuccessfulSyncAtIso,
    bodyScopeConnected,
    metricSync,
    cardAction,
    openForConnect,
    close,
    onPrimary,
    onPressCardConnection,
    onToggleMetricSync,
    refreshLastUpdatedFromStorage,
  };
}
