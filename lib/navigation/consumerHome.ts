/**
 * Canonical authenticated consumer Home.
 *
 * Filesystem route remains `/(app)/(tabs)/dash`. Bottom-tab label remains Home.
 * Visible screen title is Oli (compact centered header).
 */
import type { Href } from "expo-router";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

export const CONSUMER_HOME_HREF = OLI_TAB_ROUTES.dash as Href;
export const CONSUMER_HOME_PATHNAME = "/dash" as const;
export const CONSUMER_HOME_LABEL = "Home" as const;
/** Visible Home screen header title (tab label remains Home). */
export const CONSUMER_HOME_SCREEN_TITLE = "Oli" as const;
export const CONSUMER_HOME_A11Y_LABEL = "Home" as const;

/** Canonical Today primary tab. */
export const CONSUMER_TODAY_HREF = OLI_TAB_ROUTES.today as Href;
export const CONSUMER_TODAY_PATHNAME = "/today" as const;
export const CONSUMER_TODAY_LABEL = "Today" as const;
export const CONSUMER_TODAY_A11Y_LABEL = "Today" as const;

/** Primary Home product section — category entry. */
export const HOME_MY_HEALTH_PERFORMANCE_TITLE = "My Health & Performance" as const;

export const HOME_TODAY_EMPTY_TITLE = "No health data is available for today yet." as const;
export const HOME_TODAY_EMPTY_BODY =
  "Data will appear as you add information or connect supported sources." as const;

/** Copy that consumer shells must not introduce. */
export const ANALYTICS_FIRST_PROHIBITED_COPY = [
  "Your priority is",
  "You should",
  "Oli recommends",
  "You need to fix",
  "Change your program to",
  "The cause is",
  "This plan caused",
  "Oli created your plan",
  "What Oli Sees",
] as const;
