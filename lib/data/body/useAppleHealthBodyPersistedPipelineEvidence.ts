import { useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  getAppleHealthBodyBackfillState,
  getAppleHealthBodyLastCheckedAt,
  getAppleHealthConnected,
} from "@/lib/integrations/appleHealth/storage";

import { bodyAppleHealthPersistedPipelineEvidence } from "./appleHealthBodyPersistedEvidence";

/**
 * Hydrates persisted “body pipeline worked before” flags from AsyncStorage (iOS only).
 * Non-iOS: hydrated immediately with no evidence.
 */
export function useAppleHealthBodyPersistedPipelineEvidence(): {
  hydrated: boolean;
  hasEvidence: boolean;
} {
  const [state, setState] = useState(() => ({
    hydrated: Platform.OS !== "ios",
    hasEvidence: false,
  }));

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    let cancelled = false;
    void (async () => {
      try {
        const [appleHealthConnected, bodyLastCheckedAt, backfill] = await Promise.all([
          getAppleHealthConnected(),
          getAppleHealthBodyLastCheckedAt(),
          getAppleHealthBodyBackfillState(),
        ]);
        if (cancelled) return;
        setState({
          hydrated: true,
          hasEvidence: bodyAppleHealthPersistedPipelineEvidence({
            appleHealthConnected,
            bodyLastCheckedAt,
            backfill,
          }),
        });
      } catch {
        if (!cancelled) setState({ hydrated: true, hasEvidence: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
