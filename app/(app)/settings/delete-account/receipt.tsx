// app/(app)/settings/delete-account/receipt.tsx
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { clearLocalAppState } from "@/lib/app/reset";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function DeleteAccountReceiptScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = typeof params.requestId === "string" ? params.requestId : null;

  useEffect(() => {
    let alive = true;
    void (async () => {
      // Give the user a beat to read the message.
      await new Promise((r) => setTimeout(r, 600));

      // Clear local caches first, then sign out.
      await clearLocalAppState();
      await signOut();

      if (!alive) return;
      router.replace("/(auth)/sign-in");
    })();

    return () => {
      alive = false;
    };
  }, [router, signOut]);

  return (
    <ModuleScreenShell title="Request received" subtitle="Signing you out…">
      <View style={{ gap: 12, alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={{ textAlign: "center" }}>We’ve received your deletion request.</Text>
        {requestId ? (
          <Text style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}>Request ID: {requestId}</Text>
        ) : null}
      </View>
    </ModuleScreenShell>
  );
}
