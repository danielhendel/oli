/** Canonical Expo Router paths for bottom-tab roots (single source for tab navigation). */
export const OLI_TAB_ROUTES = {
  dash: "/(app)/(tabs)/dash",
  program: "/(app)/(tabs)/program",
  progress: "/(app)/(tabs)/progress",
  you: "/(app)/(tabs)/you",
  timeline: "/(app)/(tabs)/timeline",
  library: "/(app)/(tabs)/library",
} as const;

export type OliTabRouteKey = keyof typeof OLI_TAB_ROUTES;
