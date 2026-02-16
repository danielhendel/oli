// app/(app)/nutrition/setup.tsx
import React from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { toYMD } from "@/lib/util/date";
import SetupList from "@/components/setup/SetupList";
import DetailHeader from "@/components/layout/DetailHeader";

export default function NutritionSetupScreen() {
  const { ymd } = useLocalSearchParams<{ ymd?: string }>();
  const chosenDay = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());

  function onBack() {
    // Route groups are stripped from URLs; the Nutrition tab path is "/nutrition".
    router.replace({ pathname: "/nutrition", params: { focusYmd: chosenDay } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <DetailHeader title="New Nutrition" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <SetupList
          category="nutrition"
          onManual={() =>
            router.push({ pathname: "/nutrition/log/manual", params: { ymd: chosenDay } })
          }
          onTemplates={() =>
            router.push({ pathname: "/nutrition/setup/templates", params: { ymd: chosenDay } })
          }
          onPast={() => router.push({ pathname: "/nutrition/setup/past", params: { ymd: chosenDay } })}
        />
      </ScrollView>
    </View>
  );
}
