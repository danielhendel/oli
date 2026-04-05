import React from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { ModuleSettingsPlaceholderScreen } from "@/lib/ui/ModuleSettingsPlaceholderScreen";

export default function BodySettingsScreen() {
  const router = useRouter();

  return (
    <ModuleSettingsPlaceholderScreen
      title="Body Composition settings"
      description="Preferences for body measurements and sources will live here. Open Devices to manage connected sources, or return to your overview."
      overviewHref="/(app)/body"
      overviewButtonLabel="Open Body overview"
      overviewAccessibilityLabel="Go to Body Composition overview"
      extraActions={
        <>
          <Pressable
            onPress={() => router.push("/(app)/settings/devices")}
            style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
            accessibilityRole="button"
            accessibilityLabel="Open devices"
          >
            <Text style={styles.linkText}>Devices</Text>
          </Pressable>
          {Platform.OS === "ios" ? (
            <Pressable
              onPress={() => router.push("/(app)/settings/devices/apple_health")}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open Apple Health device settings"
            >
              <Text style={styles.linkText}>Apple Health in Settings</Text>
            </Pressable>
          ) : null}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  linkRow: {
    paddingVertical: 10,
  },
  linkPressed: { opacity: 0.72 },
  linkText: { fontSize: 16, fontWeight: "600", color: BODY_INDIGO },
});
