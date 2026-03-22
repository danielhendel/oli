/**
 * Placeholder: expanded workout analytics (charts and metrics beyond overview).
 */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { EmptyState } from "@/lib/ui/ScreenStates";

export default function WorkoutAnalyticsDetailScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.body}>
      <View style={styles.inner}>
        <EmptyState
          title="More analytics soon"
          description="Charts and workout stats beyond the overview will appear here."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
  inner: { flex: 1, paddingHorizontal: 16 },
});
