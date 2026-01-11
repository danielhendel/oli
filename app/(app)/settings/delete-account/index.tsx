// app/(app)/settings/delete-account/index.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";

export default function DeleteAccountInfoScreen() {
  const router = useRouter();

  return (
    <ModuleScreenShell title="Delete account" subtitle="This is irreversible">
      <View style={{ gap: 12 }}>
        <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "800" }}>What will be deleted</Text>
          <Text>- Your Firebase account (sign-in identity)</Text>
          <Text>- Your Firestore user data and history</Text>
          <Text style={{ marginTop: 6 }}>After you continue, you’ll confirm by typing DELETE.</Text>
        </View>

        <View style={{ borderWidth: 1, borderColor: "#e6a0a0", borderRadius: 12, padding: 12, gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "800" }}>Important</Text>
          <Text>You will be signed out immediately after we receive your request.</Text>
          <Text>If you change your mind, do not proceed.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(app)/settings/delete-account/confirm")}
          style={{ backgroundColor: "#111", padding: 14, borderRadius: 12, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Continue</Text>
        </Pressable>
      </View>
    </ModuleScreenShell>
  );
}
