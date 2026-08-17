/**
 * Reachability notes for destinations that are no longer primary dock items.
 *
 * Timeline remains under Progress. Library (lineage/replay) remains under You.
 * Program is now the Plan destination. Deep links stay intact.
 */

import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

export type SecondaryExploreDestination = {
  id: "timeline" | "library";
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
    id: "library",
    label: "Data lineage",
    href: OLI_TAB_ROUTES.library,
    testID: "settings-explore-library",
  },
] as const;
