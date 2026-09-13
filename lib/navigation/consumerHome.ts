/**
 * Canonical authenticated consumer Home.
 *
 * Filesystem route remains `/(app)/(tabs)/dash` (least disruptive; CI and
 * deep links already depend on it). The bottom-tab label remains Home.
 * The visible screen title is Oli.
 *
 * Do not treat this helper as Today, Dash, Command Center, or a dual home.
 */
import type { Href } from "expo-router";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

export const CONSUMER_HOME_HREF = OLI_TAB_ROUTES.dash as Href;
export const CONSUMER_HOME_PATHNAME = "/dash" as const;
export const CONSUMER_HOME_LABEL = "Home" as const;
/** Visible Home screen header title (tab label remains Home). */
export const CONSUMER_HOME_SCREEN_TITLE = "Oli" as const;
export const CONSUMER_HOME_A11Y_LABEL = "Oli" as const;

/** Primary Home product section — category entry. */
export const HOME_MY_HEALTH_PERFORMANCE_TITLE = "My Health & Performance" as const;

/** Current-day Daily Monitor section — not the primary destination name. */
export const HOME_TODAY_SECTION_TITLE = "Today" as const;

export const HOME_TODAY_EMPTY_TITLE = "No health data is available for today yet." as const;
export const HOME_TODAY_EMPTY_BODY =
  "Data will appear as you add information or connect supported sources." as const;

/** Copy that R1 Home / Plan / Progress / You shells must not introduce. */
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
