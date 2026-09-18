import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";

import {
  connectAppleHealthBodyForComposition,
  syncAppleHealthBodyLatestForComposition,
  type AppleHealthBodyCompositionConnectPhase,
} from "@/lib/data/body/connectAppleHealthBodyForComposition";
import {
  mapConnectPhaseToCardAction,
  type AppleHealthBodyConnectSheetPhase,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAppleHealthBodyBackfillState } from "@/lib/integrations/appleHealth/storage";

export type UseAppleHealthBodyConnectSheetArgs = {
  accessPhase: string;
  onDataMaybeChanged: () => void;
  refreshAccess: () => Promise<void>;
};

/**
 * Orchestrates the in-context Body Apple Health connect sheet.
 * Account-scoped: cancels/resets when UID changes.
 */
export function useAppleHealthBodyConnectSheet(args: UseAppleHealthBodyConnectSheetArgs) {
  const { accessPhase, onDataMaybeChanged, refreshAccess } = args;
  const { user, getIdToken } = useAuth();
  const netInfo = useNetInfo();
  const uid = user?.uid;
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<AppleHealthBodyConnectSheetPhase>("explaining");
  const [detailLine, setDetailLine] = useState<string | null>(null);
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
      setDetailLine(null);
      activeUid.current = uid;
    }
  }, [uid]);

  // Surface incomplete import if a checkpoint is mid-flight (same device, after reopen).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await getAppleHealthBodyBackfillState().catch(() => null);
      if (cancelled || !s) return;
      if (s.status === "in_progress") {
        setPhase("importingEarlier");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const openForConnect = useCallback(() => {
    setDetailLine(null);
    setPhase("explaining");
    setVisible(true);
  }, []);

  const openForStatus = useCallback(() => {
    setDetailLine(null);
    setPhase((current) => {
      if (
        current === "importingRecent" ||
        current === "importingEarlier" ||
        current === "findingLatest" ||
        current === "failed" ||
        current === "waitingForNetwork"
      ) {
        return current;
      }
      return "connectedStatus";
    });
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const runConnect = useCallback(async () => {
    if (inFlight.current) return;
    if (!uid) {
      setPhase("failed");
      setDetailLine(null);
      return;
    }

    if (netInfo.isConnected === false) {
      setPhase("waitingForNetwork");
      return;
    }

    inFlight.current = true;
    setDetailLine(null);
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
      if (result.samplesIngested > 0) {
        setDetailLine(`${result.samplesIngested} measurements imported`);
      }
      onDataRef.current();
    } catch {
      if (activeUid.current === uid) setPhase("failed");
    } finally {
      inFlight.current = false;
    }
  }, [uid, getIdToken, netInfo.isConnected]);

  const onPrimary = useCallback(() => {
    if (phase === "explaining" || phase === "failed" || phase === "waitingForNetwork") {
      void runConnect();
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
  }, [phase, runConnect, close]);

  const onSyncLatest = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await syncAppleHealthBodyLatestForComposition({
        getIdToken,
        onLatestSynced: () => onDataRef.current(),
      });
      if (!res.ok) {
        setPhase("failed");
        return;
      }
      setDetailLine(
        res.ingested > 0 ? `${res.ingested} measurements imported` : "No new measurements",
      );
      setPhase("upToDate");
      await refreshAccessRef.current();
    } finally {
      inFlight.current = false;
    }
  }, [getIdToken]);

  const transientImport =
    phase === "importingRecent" ||
    phase === "importingEarlier" ||
    phase === "findingLatest" ||
    phase === "requestingPermission" ||
    phase === "waitingForNetwork" ||
    phase === "failed";

  const cardAction = mapConnectPhaseToCardAction(
    transientImport ? phase : "idle",
    accessPhase,
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
      phase === "connectedStatus"
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
  }, [accessPhase, phase, openForConnect, openForStatus]);

  return {
    visible,
    phase,
    detailLine,
    cardAction,
    openForConnect,
    close,
    onPrimary,
    onSyncLatest,
    onPressCardConnection,
  };
}
