/** Canonical Expo Router paths for bottom-tab roots (single source for tab navigation). */
export const OLI_TAB_ROUTES = {
  dash: "/(app)/(tabs)/dash",
  timeline: "/(app)/(tabs)/timeline",
  program: "/(app)/(tabs)/program",
  library: "/(app)/(tabs)/library",
} as const;

export type OliTabRouteKey = keyof typeof OLI_TAB_ROUTES;
