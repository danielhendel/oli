import { ACTIVITY_CONSUMER_LABEL } from "@/lib/navigation/domainPresentation";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

export type ProgressHistoryLink = {
  id: string;
  label: string;
  accessibilityLabel: string;
  href: string;
  testID: string;
};

export const PROGRESS_QUESTION = "How am I changing?" as const;

export const PROGRESS_EMPTY_TITLE = "No longer-term progress to show yet" as const;
export const PROGRESS_EMPTY_BODY =
  "Weekly progress and history appear here as measurements accumulate. This is not a daily snapshot." as const;

export const PROGRESS_HISTORY_LINKS: readonly ProgressHistoryLink[] = [
  {
    id: "timeline",
    label: "Timeline",
    accessibilityLabel: "View Timeline",
    href: OLI_TAB_ROUTES.timeline,
    testID: "progress-link-timeline",
  },
  {
    id: "body",
    label: "Body history",
    accessibilityLabel: "View Body history",
    href: "/(app)/body/calendar",
    testID: "progress-link-body",
  },
  {
    id: "movement",
    label: `${ACTIVITY_CONSUMER_LABEL} history`,
    accessibilityLabel: `View ${ACTIVITY_CONSUMER_LABEL} history`,
    href: "/(app)/activity/history",
    testID: "progress-link-movement",
  },
  {
    id: "strength",
    label: "Strength history",
    accessibilityLabel: "View Strength history",
    href: "/(app)/workouts/history",
    testID: "progress-link-strength",
  },
  {
    id: "cardio",
    label: "Cardio history",
    accessibilityLabel: "View Cardio history",
    href: "/(app)/cardio/calendar",
    testID: "progress-link-cardio",
  },
  {
    id: "nutrition",
    label: "Nutrition history",
    accessibilityLabel: "View Nutrition history",
    href: "/(app)/nutrition/calendar",
    testID: "progress-link-nutrition",
  },
  {
    id: "recovery",
    label: "Recovery history",
    accessibilityLabel: "View Recovery history",
    href: "/(app)/recovery/sleep/calendar",
    testID: "progress-link-recovery",
  },
] as const;
