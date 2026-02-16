// app/(app)/nutrition/day/[ymd].tsx
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";

import DetailHeader from "@/components/layout/DetailHeader";
import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";

export default function NutritionDayScreen() {
  const { ymd } = useLocalSearchParams<{ ymd?: string }>();
  const router = useRouter();

  function onClose() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (typeof ymd === "string" && ymd.length > 0) {
      const href = { pathname: "/(app)/(tabs)/nutrition", params: { focusYmd: ymd } } satisfies Href;
      router.replace(href);
    } else {
      router.replace("/(app)/(tabs)/nutrition");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DetailHeader title="Nutrition" onBack={onClose} />
      <View style={{ padding: 16, gap: 12 }}>
        <Card variant="elevated" radius="xl" padding="lg" style={{ gap: 8 }}>
          <Text weight="bold">Day</Text>
          <Text tone="muted">{ymd ?? "—"}</Text>
          {/* TODO: Render totals, meals, and logs for this day */}
        </Card>
      </View>
    </SafeAreaView>
  );
}
