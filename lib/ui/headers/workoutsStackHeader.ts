import { Platform, type TextStyle } from "react-native";
import { OLI_DARK } from "@/lib/ui/theme/oliSemantic";

/**
 * Workouts stack header roles (Apple Health–style hierarchy):
 * - module: hub screen (e.g. overview) — centered title when possible
 * - detail: pushed list/record surfaces (calendar, day, history, placeholders)
 * - task: focused edits / pickers (edit *, exercise picker)
 */
export type WorkoutsHeaderRole = "module" | "detail" | "task";

export const WORKOUTS_HEADER_TITLE_COLOR = OLI_DARK.textPrimary;

/** Grouped-list / module background behind cards (overview, day, placeholders). */
export const WORKOUTS_SCREEN_CONTENT_BG = OLI_DARK.screenBgGrouped;

/** Native stack header + custom {@link WorkoutsNavBar} — same as screen chrome so the bar reads as one surface. */
export const WORKOUTS_HEADER_BAR_BG = WORKOUTS_SCREEN_CONTENT_BG;

/** Native stack header title — matches iOS standard nav title weight. */
export const WORKOUTS_STACK_HEADER_TITLE_STYLE: TextStyle = {
  fontSize: 17,
  fontWeight: "600",
  color: WORKOUTS_HEADER_TITLE_COLOR,
};

/**
 * Shared visual options for React Navigation stack headers on workouts routes.
 * Merge with `title`, `headerLeft`, `headerRight` in screen `setOptions`.
 */
export function workoutsStackNavigationOptions(role: WorkoutsHeaderRole): Record<string, unknown> {
  return {
    headerTitleStyle: WORKOUTS_STACK_HEADER_TITLE_STYLE,
    headerStyle: {
      backgroundColor: WORKOUTS_HEADER_BAR_BG,
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerShadowVisible: false,
    headerTintColor: WORKOUTS_HEADER_TITLE_COLOR,
    ...(Platform?.OS === "ios" && role === "module" ? { headerTitleAlign: "center" } : {}),
  };
}
