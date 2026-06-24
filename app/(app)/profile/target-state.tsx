// app/(app)/profile/target-state.tsx
import React, { useLayoutEffect } from "react";
import { useNavigation } from "expo-router";

import { TargetStateScreen } from "@/lib/ui/target-state/TargetStateScreen";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function TargetStateRoute() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Target State",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return <TargetStateScreen />;
}
