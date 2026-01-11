// app/(app)/settings/account.tsx
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function SettingsAccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <ModuleScreenShell title="Account" subtitle="Sign-in status">
      <View style={{ gap: 12 }}>
        <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "800" }}>Status</Text>
          <Text>Signed in: {user ? "yes" : "no"}</Text>
          {user ? <Text>UID: {user.uid}</Text> : null}
        </View>

        {!user ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(auth)/sign-in")}
            style={{ backgroundColor: "#111", padding: 14, borderRadius: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Sign in</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Alert.alert("Sign out?", "You’ll need to sign in again to access your data.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign out", style: "destructive", onPress: () => void signOut() },
              ]);
            }}
            style={{ backgroundColor: "#111", padding: 14, borderRadius: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Sign out</Text>
          </Pressable>
        )}

        {user ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>Danger zone</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(app)/settings/delete-account")}
              style={{
                borderWidth: 1,
                borderColor: "#e6a0a0",
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#b00020", fontWeight: "800" }}>Delete account</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ModuleScreenShell>
  );
}
