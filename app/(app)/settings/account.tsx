// app/(app)/settings/account.tsx
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export default function SettingsAccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const email = typeof user?.email === "string" && user.email.trim().length > 0 ? user.email.trim() : null;

  return (
    <ModuleScreenShell title="Account" subtitle="Sign-in status" hideTitleChrome>
      <View style={styles.body} testID="account-status-panel" accessibilityLabel="Account status">
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Status</Text>
          <Text style={styles.panelBody}>{user ? "Signed in" : "Signed out"}</Text>
          {email ? (
            <Text style={styles.panelMuted} testID="account-email">
              {email}
            </Text>
          ) : null}
        </View>

        {!user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            onPress={() => router.push("/(auth)/sign-in")}
            style={styles.cta}
          >
            <Text style={styles.ctaLabel}>Sign in</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => {
              Alert.alert("Sign out?", "You’ll need to sign in again to access your data.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign out",
                  style: "destructive",
                  onPress: () => void signOut(),
                },
              ]);
            }}
            style={styles.cta}
          >
            <Text style={styles.ctaLabel}>Sign out</Text>
          </Pressable>
        )}
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  panel: {
    backgroundColor: UI_CARD_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  panelTitle: { fontSize: 14, fontWeight: "800", color: UI_TEXT_PRIMARY },
  panelBody: { fontSize: 16, color: UI_TEXT_PRIMARY },
  panelMuted: { fontSize: 14, color: UI_TEXT_SECONDARY },
  cta: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaLabel: { color: "#fff", fontWeight: "800" },
});
