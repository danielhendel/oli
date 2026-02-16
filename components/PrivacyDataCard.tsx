// components/PrivacyDataCard.tsx
import React from "react";
import { Linking, View } from "react-native";
import Constants from "expo-constants";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import { requestDataExport } from "@/lib/account/export";

type Extra = { privacyUrl?: string };
const PRIVACY_URL =
  ((Constants.expoConfig?.extra as Extra | undefined)?.privacyUrl) ??
  "https://yourdomain.com/privacy"; // TODO: replace with real URL

export default function PrivacyDataCard() {
  const onPolicy = () => {
    void Linking.openURL(PRIVACY_URL);
  };

  const onExport = async () => {
    try {
      const blob = await requestDataExport(); // JSON stub for now
      // Future: add Share API to save/share the file.
      console.log("Export blob size", blob.size);
    } catch {
      // Soft-fail to keep UI smooth (telemetry can capture silently if configured)
    }
  };

  return (
    <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text weight="bold" accessibilityRole="header">
        Privacy & Data
      </Text>

      <Text tone="muted">
        You own your data. You can export or delete it at any time.
      </Text>

      <Button
        label="Privacy Policy"
        variant="ghost"
        onPress={onPolicy}
        accessibilityLabel="Open privacy policy"
      />

      <Button
        label="Export my data (JSON)"
        variant="ghost"
        onPress={onExport}
        accessibilityLabel="Export my data as JSON"
      />

      <Text tone="muted" size="sm" style={{ marginTop: 6 }}>
        Export creates a JSON summary of your profile and logs. Deleting your account removes your
        profile, logs, and Firebase user permanently. You may be asked to re-authenticate for
        security.
      </Text>
    </View>
  );
}
