import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";

import {
  connectAppleHealthBodyForComposition,
  resumeAppleHealthBodyHistoryImport,
  syncAppleHealthBodyLatestForComposition,
  type AppleHealthBodyCompositionConnectPhase,
  type AppleHealthBodyLatestRefreshTrigger,
} from "@/lib/data/body/connectAppleHealthBodyForComposition";
import {
  mapConnectPhaseToCardAction,
  type AppleHealthBodyConnectSheetPhase,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getAppleHealthBodyBackfillState,
  getAppleHealthBodyLastCheckedAt,
} from "@/lib/integrations/appleHealth/storage";

export type UseAppleHealthBodyConnectSheetArgs = {
  accessPhase: string;
  onDataMaybeChanged: () => void;
  refreshAccess: () => Promise<void>;
};

const STATUS_SHEET_PHASES: ReadonlySet<AppleHealthBodyConnectSheetPhase> = new Set([
  "upToDate",
  "connectedNoData",
  "connectedStatus",
  "historyIncomplete",
  "waitingForNetwork",
]);

/**
 * Orchestrates the in-context Body Apple Health connect sheet.
 * Separates source Connected from history import; latest refresh on sheet-open / pull.
 */
export function useAppleHealthBodyConnectSheet(args: UseAppleHealthBodyConnectSheetArgs) {
  const { accessPhase, onDataMaybeChanged, refreshAccess } = args;
  const { user, getIdToken } = useAuth();
  const netInfo = useNetInfo();
  const uid = user?.uid;
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<AppleHealthBodyConnectSheetPhase>("explaining");
  const [detailLine, setDetailLine] = useState<string | null>(null);
  const [historyAttention, setHistoryAttention] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastSuccessfulSyncAtIso, setLastSuccessfulSyncAtIso] = useState<string | null>(null);
  const inFlight = useRef(false);
  const refreshInFlight = useRef(false);
  const activeUid = useRef<string | undefined>(uid);
  const prevVisible = useRef(false);
  const refreshSessionId = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const onDataRef = useRef(onDataMaybeChanged);
  const refreshAccessRef = useRef(refreshAccess);
  onDataRef.current = onDataMaybeChanged;
  refreshAccessRef.current = refreshAccess;

  useEffect(() => {
    if (activeUid.current !== uid) {
      inFlight.current = false;
      refreshInFlight.current = false;
      refreshSessionId.current += 1;
      setVisible(false);
      setPhase("explaining");
      setDetailLine(null);
      setHistoryAttention(false);
      setRefreshing(false);
      setRefreshError(null);
      setLastSuccessfulSyncAtIso(null);
      activeUid.current = uid;
    }
  }, [uid]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [backfill, lastChecked] = await Promise.all([
        getAppleHealthBodyBackfillState().catch(() => null),
        getAppleHealthBodyLastCheckedAt().catch(() => null),
      ]);
      if (cancelled) return;
      if (lastChecked) setLastSuccessfulSyncAtIso(lastChecked);
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

  const runLatestRefresh = useCallback(
    async (trigger: AppleHealthBodyLatestRefreshTrigger, sessionId: number) => {
      if (refreshInFlight.current) return;
      if (!uid || activeUid.current !== uid) return;
      if (phaseRef.current === "needsReview" || phaseRef.current === "explaining") return;
      if (netInfo.isConnected === false) {
        setRefreshError("Couldn’t refresh. Check your connection and pull down to try again.");
        setRefreshing(false);
        return;
      }
      refreshInFlight.current = true;
      setRefreshing(true);
      setRefreshError(null);
      try {
        const res = await syncAppleHealthBodyLatestForComposition(
          {
            getIdToken,
            onLatestSynced: () => {
              if (activeUid.current !== uid) return;
              onDataRef.current();
            },
          },
          { trigger },
        );
        if (activeUid.current !== uid || sessionId !== refreshSessionId.current) return;
        if (!res.ok) {
          setRefreshError(res.message);
          return;
        }
        const checked = await getAppleHealthBodyLastCheckedAt().catch(() => null);
        if (activeUid.current !== uid || sessionId !== refreshSessionId.current) return;
        if (checked) setLastSuccessfulSyncAtIso(checked);
        setRefreshError(null);
        await refreshAccessRef.current();
      } catch {
        if (activeUid.current === uid && sessionId === refreshSessionId.current) {
          setRefreshError("Couldn’t refresh. Check your connection and pull down to try again.");
        }
      } finally {
        refreshInFlight.current = false;
        if (activeUid.current === uid && sessionId === refreshSessionId.current) {
          setRefreshing(false);
        }
      }
    },
    [uid, getIdToken, netInfo.isConnected],
  );

  // Stable false→true visibility transition: at most one latest refresh per open session.
  useEffect(() => {
    const becameVisible = visible && !prevVisible.current;
    prevVisible.current = visible;
    if (!visible) return;
    if (!becameVisible) return;
    const currentPhase = phaseRef.current;
    if (!STATUS_SHEET_PHASES.has(currentPhase)) return;
    if (accessPhase === "denied" || currentPhase === "needsReview") return;
    const sessionId = ++refreshSessionId.current;
    void runLatestRefresh("body_status_sheet_open", sessionId);
  }, [visible, uid, accessPhase, runLatestRefresh]);

  const openForConnect = useCallback(() => {
    setDetailLine(null);
    setRefreshError(null);
    setPhase("explaining");
    setVisible(true);
  }, []);

  const openForStatus = useCallback(() => {
    setDetailLine(null);
    setRefreshError(null);
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
  }, [historyAttention]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const onRefreshLatest = useCallback(async () => {
    const sessionId = refreshSessionId.current;
    await runLatestRefresh("pull_to_refresh", sessionId);
  }, [runLatestRefresh]);

  const runConnect = useCallback(async () => {
    if (inFlight.current) return;
    if (!uid) {
      setPhase("failed");
      setDetailLine(null);
      return;
    }

    if (netInfo.isConnected === false) {
      setPhase("waitingForNetwork");
      setHistoryAttention(true);
      return;
    }

    inFlight.current = true;
    setDetailLine(null);
    setRefreshError(null);
    try {
      const result = await connectAppleHealthBodyForComposition({
        getIdToken,
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
      const checked = await getAppleHealthBodyLastCheckedAt().catch(() => null);
      if (checked) setLastSuccessfulSyncAtIso(checked);
      onDataRef.current();
    } catch {
      if (activeUid.current === uid) setPhase("failed");
    } finally {
      inFlight.current = false;
    }
  }, [uid, getIdToken, netInfo.isConnected]);

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

  return {
    visible,
    phase,
    detailLine,
    historyAttention,
    refreshing,
    refreshError,
    lastSuccessfulSyncAtIso,
    cardAction,
    openForConnect,
    close,
    onPrimary,
    onRefreshLatest,
    onPressCardConnection,
  };
}
