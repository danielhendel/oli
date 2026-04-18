import { useCallback, useEffect } from "react";
import { AppState, InteractionManager, Platform } from "react-native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { runForcedLocalYesterdayAppleHealthStepsIngest } from "@/lib/data/activity/appleHealthForcedLocalYesterdaySteps";

/**
 * Runs previous-local-day Apple Health steps finalization whenever auth is ready:
 * app launch (mount), and whenever the app returns to foreground.
 * Does not depend on Activity (or any module screen) mounting.
 */
export function useAppleHealthForcedYesterdayFinalize(): void {
  const { user, initializing, getIdToken } = useAuth();

  const run = useCallback(() => {
    if (Platform.OS !== "ios" || !user || initializing) return;
    InteractionManager.runAfterInteractions(() => {
      void runForcedLocalYesterdayAppleHealthStepsIngest(getIdToken);
    });
  }, [getIdToken, initializing, user]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    if (Platform.OS !== "ios" || !user || initializing) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => sub.remove();
  }, [run, user, initializing]);
}
