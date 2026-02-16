// app/(app)/recovery/setup.tsx
import React from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { toYMD } from "@/lib/util/date";
import SetupList from "@/components/setup/SetupList";
import DetailHeader from "@/components/layout/DetailHeader";

export default function RecoverySetupScreen() {
  const { ymd } = useLocalSearchParams<{ ymd?: string }>();
  const chosenDay = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());

  function onBack() {
    router.replace({ pathname: "/recovery", params: { focusYmd: chosenDay } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <DetailHeader title="New Recovery" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <SetupList
          category="recovery"
          onManual={() => router.push({ pathname: "/recovery/log/manual", params: { ymd: chosenDay } })}
          onTemplates={() => router.push({ pathname: "/recovery/setup/templates", params: { ymd: chosenDay } })}
          onPast={() => router.push({ pathname: "/recovery/setup/past", params: { ymd: chosenDay } })}
        />
      </ScrollView>
    </View>
  );
}
