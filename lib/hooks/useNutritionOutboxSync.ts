import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { useAuth } from "@/lib/auth/AuthProvider";
import { NutritionQueue } from "@/lib/nutrition/NutritionQueue";

/**
 * Background flush for queued nutrition meal logs when network returns (no screens).
 */
export function useNutritionOutboxSync(): void {
  const { user, getIdToken } = useAuth();
  const netInfo = useNetInfo();
  const busy = useRef(false);

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      if (busy.current) return;
      if (netInfo.isConnected !== true) return;
      busy.current = true;
      try {
        await NutritionQueue.flush(getIdToken);
      } finally {
        busy.current = false;
      }
    };

    void run();

    const sub = NetInfo.addEventListener((s) => {
      if (s.isConnected) void run();
    });

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") void run();
    };
    const appSub = AppState.addEventListener("change", onAppState);

    return () => {
      sub();
      appSub.remove();
    };
  }, [user, getIdToken, netInfo.isConnected]);
}
