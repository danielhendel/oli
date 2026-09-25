import React, { useLayoutEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import {
  bodyHistoryCalendarAccessibilityLabel,
  bodyHistoryCalendarHref,
  bodyHistoryListAccessibilityLabel,
  bodyHistoryListHref,
  bodyMetricDetailBackAccessibilityLabel,
  type BodyHistoryMetricFilter,
} from "@/lib/data/body/bodyHistoryMetricFilter";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type BodyMetricDetailHeaderProps = {
  readonly title: string;
  readonly historyMetric: BodyHistoryMetricFilter;
};

/**
 * Left cluster: circular back + metric title (not centered).
 * Shared by Weight / Body Fat / Lean Mass detail screens.
 */
export function BodyMetricDetailHeaderLeft(props: {
  title: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.leftCluster} testID="body-metric-detail-header-left">
      <HeaderBackButton
        onPress={props.onBack}
        accessibilityLabel={bodyMetricDetailBackAccessibilityLabel()}
        style={styles.back}
        testID="body-metric-detail-header-back"
      />
      <Text
        style={styles.title}
        accessibilityRole="header"
        numberOfLines={1}
        testID="body-metric-detail-header-title"
      >
        {props.title}
      </Text>
    </View>
  );
}

/**
 * Applies the Stage 3C metric-detail header: title beside back, calendar/list on the right.
 */
export function useBodyMetricDetailHeader(props: BodyMetricDetailHeaderProps): void {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerTitleAlign: "left",
      title: "",
      headerTitle: () => null,
      // Compact native bar — avoid extra left inset stacking with HeaderBackButton margin.
      headerLeftContainerStyle: { paddingHorizontal: 0 },
      headerRightContainerStyle: { paddingRight: 10 },
      headerLeft: () => (
        <BodyMetricDetailHeaderLeft
          title={props.title}
          onBack={() => navigation.goBack()}
        />
      ),
      headerRight: () => (
        <HeaderControls
          gap={10}
          calendarAccessibilityLabel={bodyHistoryCalendarAccessibilityLabel(props.historyMetric)}
          onCalendarPress={() =>
            router.push(bodyHistoryCalendarHref(props.historyMetric) as never)
          }
          logAccessibilityLabel={bodyHistoryListAccessibilityLabel(props.historyMetric)}
          onLogPress={() => router.push(bodyHistoryListHref(props.historyMetric) as never)}
        />
      ),
    });
  }, [navigation, router, props.title, props.historyMetric]);
}

const styles = StyleSheet.create({
  leftCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 220,
    paddingRight: 8,
  },
  back: {
    // HeaderBackButton already applies marginLeft: 12 — do not stack another inset.
    marginLeft: 0,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "600",
    flexShrink: 1,
  },
});
