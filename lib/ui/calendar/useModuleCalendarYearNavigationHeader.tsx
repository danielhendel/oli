import { useEffect } from "react";
import { Platform, Text } from "react-native";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { useOliColors } from "@/lib/ui/theme/OliColorContext";

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
  const colors = useOliColors();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: colors.appScreenBg },
      headerTintColor: colors.textPrimary,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerTitle: () => (
        <Text
          style={[
            MODULE_CALENDAR_HEADER_YEAR_TEXT_STYLE,
            { color: colors.textPrimary },
          ]}
          accessibilityRole="header"
        >
          {String(headerYear)}
        </Text>
      ),
      ...(Platform.OS === "ios" ? { headerTitleAlign: "center" as const } : {}),
    });
  }, [colors.appScreenBg, colors.textPrimary, navigation, headerYear]);
}
