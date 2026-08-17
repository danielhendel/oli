import type { Href } from "expo-router";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

/**
 * Canonical authenticated consumer Home.
 *
 * Filesystem route remains `/(app)/(tabs)/dash` (least disruptive; CI and
 * deep links already depend on it). The user-facing product name is Home.
 *
 * Do not treat this helper as Today, Dash, Command Center, or a dual home.
 */
export const CONSUMER_HOME_HREF = OLI_TAB_ROUTES.dash as Href;
export const CONSUMER_HOME_PATHNAME = "/dash" as const;
export const CONSUMER_HOME_LABEL = "Home" as const;
export const CONSUMER_HOME_QUESTION = "Where am I?" as const;
export const CONSUMER_HOME_A11Y_LABEL = "Home" as const;

/** Transitional Home shell copy — not an analytical result. */
export const HOME_HEALTH_PERFORMANCE_TITLE = "Your Health & Performance" as const;
export const HOME_BASELINE_HEADING = "Building your health picture" as const;
export const HOME_BASELINE_BODY =
  "Connect data or add information to begin establishing your baseline." as const;
/** Current-day Daily Monitor section — not the primary destination name. */
export const HOME_TODAY_SECTION_TITLE = "Today" as const;

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
