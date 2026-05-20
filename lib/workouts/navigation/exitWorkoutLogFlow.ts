type WorkoutRouterLike = {
  dismissTo: (href: string | { pathname: string; params?: Record<string, string> }) => void;
};

type WorkoutRouterWithPush = WorkoutRouterLike & {
  push: (href: string | { pathname: string; params?: Record<string, string> }) => void;
};

export type WorkoutFinishNamingParams = {
  workoutId: string;
  titleAnchorObservedAt: string;
};

/**
 * Canonical live log-flow exit: pop back to existing workouts overview route
 * instead of replacing with another copy (prevents duplicate /workouts entries).
 */
export function exitLiveWorkoutLogToOverview(router: WorkoutRouterLike): void {
  router.dismissTo("/(app)/workouts");
}

/** Post-finish naming step after a live workout is completed and persisted. */
export function navigateLiveWorkoutFinishToNameScreen(
  router: WorkoutRouterWithPush,
  params: WorkoutFinishNamingParams,
): void {
  router.push({
    pathname: "/(app)/workouts/edit/rename",
    params: {
      mode: "finish",
      workoutId: params.workoutId,
      titleAnchorObservedAt: params.titleAnchorObservedAt,
    },
  });
}
