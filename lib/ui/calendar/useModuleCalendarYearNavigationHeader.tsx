import { useEffect } from "react";
import { Platform, Text } from "react-native";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  workoutsStackNavigationOptions,
  WORKOUTS_HEADER_TITLE_COLOR,
} from "@/lib/ui/headers/workoutsStackHeader";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

import { MODULE_CALENDAR_HEADER_YEAR_TEXT_STYLE } from "./moduleCalendarHeaderYear";

type MinimalStackNav = {
  setOptions: (opts: Record<string, unknown>) => void;
  goBack: () => void;
};

/**
 * Stack header: blue-gray bar, circular back, centered bold year (module calendar system).
 */
export function useModuleCalendarYearNavigationHeader(
  navigation: MinimalStackNav,
  headerYear: number,
): void {
  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: UI_APP_SCREEN_BG },
      headerTintColor: WORKOUTS_HEADER_TITLE_COLOR,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerTitle: () => <Text style={MODULE_CALENDAR_HEADER_YEAR_TEXT_STYLE}>{String(headerYear)}</Text>,
      ...(Platform.OS === "ios" ? { headerTitleAlign: "center" as const } : {}),
    });
  }, [navigation, headerYear]);
}
