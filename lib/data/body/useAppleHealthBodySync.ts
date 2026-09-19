import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useNetInfo } from "@react-native-community/netinfo";

import { useAuth } from "@/lib/auth/AuthProvider";
import {
  syncAppleHealthBodyLatestForComposition,
  type AppleHealthBodyLatestRefreshTrigger,
} from "@/lib/data/body/connectAppleHealthBodyForComposition";
import {
  getAppleHealthBodyLastCheckedAt,
  isAppleHealthDomainEnabled,
} from "@/lib/integrations/appleHealth/storage";
import { shouldRun } from "@/lib/sync/throttle";

const BODY_PAGE_ENTRY_MIN_MS = 15 * 60 * 1000;

export function useAppleHealthBodySync(onSynced?: () => void): {
  isBodySyncing: boolean;
  /** Native pull-to-refresh spinner for the Body page. */
  isPullRefreshing: boolean;
  /** Safe page-level failure copy after pull; null when idle/success. */
  pullRefreshError: string | null;
  syncAppleHealthBodyNow: () => Promise<void>;
  onPullToRefresh: () => Promise<void>;
  /** True after at least one successful latest Body sync in this session. */
  hasSuccessfulBodySync: boolean;
} {
  const { user, getIdToken } = useAuth();
  const netInfo = useNetInfo();
  const uid = user?.uid;
  const inFlight = useRef(false);
  const activeUid = useRef<string | undefined>(uid);
  const sessionIdRef = useRef(0);
  const [isBodySyncing, setIsBodySyncing] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullRefreshError, setPullRefreshError] = useState<string | null>(null);
  const [hasSuccessfulBodySync, setHasSuccessfulBodySync] = useState(false);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    if (activeUid.current !== uid) {
      inFlight.current = false;
      sessionIdRef.current += 1;
      setIsBodySyncing(false);
      setIsPullRefreshing(false);
      setPullRefreshError(null);
      setHasSuccessfulBodySync(false);
      activeUid.current = uid;
    }
  }, [uid]);

  const runLatest = useCallback(
    async (
      trigger: Extract<
        AppleHealthBodyLatestRefreshTrigger,
        "body_page_entry" | "body_page_pull_refresh"
      >,
      opts: { skipThrottle: boolean; showPullSpinner: boolean },
    ) => {
      if (inFlight.current) return;
      if (!uid || activeUid.current !== uid) return;

      // Claim before any await so concurrent entry/pull calls coalesce.
      const sessionId = sessionIdRef.current;
      inFlight.current = true;
      let uiBusy = false;

      try {
        const bodyEnabled = await isAppleHealthDomainEnabled("body").catch(() => false);
        if (!bodyEnabled || activeUid.current !== uid || sessionId !== sessionIdRef.current) {
          return;
        }

        if (!opts.skipThrottle) {
          const lastChecked = await getAppleHealthBodyLastCheckedAt().catch(() => null);
          if (!shouldRun(lastChecked, BODY_PAGE_ENTRY_MIN_MS)) return;
        }

        if (netInfo.isConnected === false) {
          if (opts.showPullSpinner) {
            setPullRefreshError(
              "Couldn’t refresh. Check your connection and pull down to try again.",
            );
          }
          return;
        }

        uiBusy = true;
        if (opts.showPullSpinner) {
          setIsPullRefreshing(true);
          setPullRefreshError(null);
        } else {
          setIsBodySyncing(true);
        }

        const res = await syncAppleHealthBodyLatestForComposition(
          {
            getIdToken,
            onLatestSynced: () => {
              if (activeUid.current !== uid) return;
              onSyncedRef.current?.();
            },
          },
          { trigger },
        );
        if (activeUid.current !== uid || sessionId !== sessionIdRef.current) return;
        if (!res.ok) {
          if (opts.showPullSpinner) {
            setPullRefreshError(res.message);
          }
          return;
        }
        setHasSuccessfulBodySync(true);
        setPullRefreshError(null);
      } catch {
        if (
          opts.showPullSpinner &&
          activeUid.current === uid &&
          sessionId === sessionIdRef.current
        ) {
          setPullRefreshError(
            "Couldn’t refresh. Check your connection and pull down to try again.",
          );
        }
      } finally {
        inFlight.current = false;
        if (uiBusy && activeUid.current === uid && sessionId === sessionIdRef.current) {
          setIsBodySyncing(false);
          if (opts.showPullSpinner) setIsPullRefreshing(false);
        }
      }
    },
    [uid, getIdToken, netInfo.isConnected],
  );

  // Connected Body page focus — silent latest-only refresh (throttled).
  useFocusEffect(
    useCallback(() => {
      void runLatest("body_page_entry", { skipThrottle: false, showPullSpinner: false });
    }, [runLatest]),
  );

  const syncAppleHealthBodyNow = useCallback(async () => {
    await runLatest("body_page_pull_refresh", { skipThrottle: true, showPullSpinner: false });
  }, [runLatest]);

  const onPullToRefresh = useCallback(async () => {
    await runLatest("body_page_pull_refresh", { skipThrottle: true, showPullSpinner: true });
  }, [runLatest]);

  return {
    isBodySyncing,
    isPullRefreshing,
    pullRefreshError,
    syncAppleHealthBodyNow,
    onPullToRefresh,
    hasSuccessfulBodySync,
  };
}
