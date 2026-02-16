// app/(app)/settings/account.tsx
import React from "react";
import { Alert, View } from "react-native";
import { Stack, useRouter, type Href } from "expo-router";

import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import Card from "@/lib/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { deleteAccount } from "@/lib/auth/deleteAccount"; // ✅ bearer-only path

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [busy, setBusy] = React.useState<"signout" | "delete" | null>(null);

  const handleSignOut = React.useCallback(async () => {
    if (busy) return;
    setBusy("signout");
    try {
      await signOut();
      // Root guard will also redirect, but we force it for snappy UX:
      const href = "/(auth)/signin" satisfies Href;
      router.replace(href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      Alert.alert("Sign out failed", msg);
    } finally {
      setBusy(null);
    }
  }, [busy, router, signOut]);

  const handleDelete = React.useCallback(() => {
    if (!user?.uid || busy) return;

    Alert.alert(
      "Delete account?",
      "This permanently deletes your profile and all logs. You may be asked to re-authenticate.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy("delete");
            try {
              await deleteAccount(); // ✅ bearer-only; ID token sent under the hood
              const href = "/(auth)/signin" satisfies Href;
              router.replace(href);
            } catch (e) {
              const msg =
                e instanceof Error ? e.message : "Unknown error. You may need to sign in again.";
              // Most common cause: requires recent login
              Alert.alert("Delete failed", msg);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }, [busy, router, user?.uid]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Account",
          headerBackTitle: "Back",
        }}
      />

      <View style={{ padding: 24, gap: 16 }}>
        <Card variant="elevated" radius="xl" padding="lg" style={{ gap: 8 }}>
          <Text weight="bold">Signed in</Text>
          <Text tone="muted">Email: {user?.email ?? "—"}</Text>
          <Text tone="muted">UID: {user?.uid ?? "—"}</Text>
        </Card>

        <Button
          label={busy === "signout" ? "Signing out…" : "Sign out"}
          onPress={handleSignOut}
          disabled={!!busy}
          accessibilityLabel="Sign out"
        />

        <Button
          variant="ghost"
          label={busy === "delete" ? "Deleting…" : "Delete account"}
          onPress={handleDelete}
          disabled={!!busy}
          accessibilityLabel="Delete account"
          accessibilityHint="Permanently deletes your account and data"
        />

        {/* ✅ Re-auth guidance for Apple review & user clarity */}
        <Text tone="muted" size="sm" style={{ marginTop: 8 }}>
          Note: You may need to re-authenticate (sign in again) before deleting your account.
          This protects your data and may be required by your sign-in provider.
        </Text>
      </View>
    </>
  );
}
