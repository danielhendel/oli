// lib/ui/headers/useBuilderStackHeader.tsx
// Shared native-stack header for Program builder pages. Matches the Activity page header:
// the soft circular HeaderBackButton on the left and a left-aligned module title.
// Reused by Workout Builder, the Program Builder hub, and the cardio/nutrition/recovery pages
// so every builder reads with one consistent back affordance and title weight.
import React, { useLayoutEffect } from "react";
import { useNavigation } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

/**
 * Apply the Activity-style stack header for a builder page: left-aligned `title` next to the
 * shared {@link HeaderBackButton}. Call once near the top of a route component.
 */
export function useBuilderStackHeader(title: string): void {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerTitleAlign: "left",
      title,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation, title]);
}
