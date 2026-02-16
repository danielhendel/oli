// app/(app)/workout/setup.tsx
import React from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { toYMD } from "@/lib/util/date";
import SetupList from "@/components/setup/SetupList";
import DetailHeader from "@/components/layout/DetailHeader";

export default function WorkoutSetupScreen() {
  const { ymd } = useLocalSearchParams<{ ymd?: string }>();
  const chosenDay = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());

  function onBack() {
    // Route groups are stripped in URLs; tab path is just "/workout"
    router.replace({ pathname: "/workout", params: { focusYmd: chosenDay } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <DetailHeader title="New Workout" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <SetupList
          category="workout"
          onManual={() => router.push({ pathname: "/workout/log/manual", params: { ymd: chosenDay } })}
          onTemplates={() => router.push({ pathname: "/workout/setup/templates", params: { ymd: chosenDay } })}
          onPast={() => router.push({ pathname: "/workout/setup/past", params: { ymd: chosenDay } })}
        />
      </ScrollView>
    </View>
  );
}
