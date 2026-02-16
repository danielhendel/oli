// app/(app)/settings/index.tsx
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import PrivacyDataCard from "@/components/PrivacyDataCard"; // compliance card (policy + export)

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, gap: 16, padding: 24 }}>
      <Text size="xl" weight="bold" accessibilityRole="header">
        Settings
      </Text>

      <Button label="Account" onPress={() => router.push("/(app)/settings/account")} />
      <Button
        label="Connections"
        variant="ghost"
        onPress={() => router.push("/(app)/settings/connections")}
      />

      <View style={{ height: 8 }} />
      <PrivacyDataCard />
    </View>
  );
}
