type WorkoutRouterLike = {
  dismissTo: (href: string | { pathname: string; params?: Record<string, string> }) => void;
};

/**
 * Canonical live log-flow exit: pop back to existing workouts overview route
 * instead of replacing with another copy (prevents duplicate /workouts entries).
 */
export function exitLiveWorkoutLogToOverview(router: WorkoutRouterLike): void {
  router.dismissTo("/(app)/workouts");
}
