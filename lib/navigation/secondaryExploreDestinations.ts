/**
 * Reachability notes for destinations removed from the Phase 2G-A primary dock.
 *
 * Timeline, Program, and Library routes are preserved. When
 * `EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1` is enabled they are no longer primary
 * bottom destinations. Secondary entry is via Settings → Explore (flag-gated).
 *
 * Deep links and internal cross-links (e.g. Library replay → Timeline day,
 * Program builder stack routes) remain intact.
 */

import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

export type SecondaryExploreDestination = {
  id: "timeline" | "program" | "library";
  label: string;
  href: string;
  testID: string;
};

export const SECONDARY_EXPLORE_DESTINATIONS: readonly SecondaryExploreDestination[] = [
  {
    id: "timeline",
    label: "Timeline",
    href: OLI_TAB_ROUTES.timeline,
    testID: "settings-explore-timeline",
  },
  {
    id: "program",
    label: "Program",
    href: OLI_TAB_ROUTES.program,
    testID: "settings-explore-program",
  },
  {
    id: "library",
    label: "Library",
    href: OLI_TAB_ROUTES.library,
    testID: "settings-explore-library",
  },
] as const;
