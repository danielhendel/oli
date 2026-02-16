// app/index.tsx
import { useEffect } from "react";
import { View, SafeAreaView } from "react-native";
import { Link, useRouter, useRootNavigationState } from "expo-router";
import { useAuthSession } from "@/lib/auth/session";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";

export default function EntryGate() {
  const router = useRouter();
  const nav = useRootNavigationState();       // undefined until root navigator mounts
  const { user, loading } = useAuthSession(); // { user | null, loading }

  useEffect(() => {
    if (loading) return;       // wait for auth
    if (!nav?.key) return;     // wait for router to mount
    if (user) {
      router.replace("/(app)/(tabs)/dash"); // ← new correct path
    }
  }, [user, loading, nav?.key, router]);

  // Avoid flashes while deciding
  if (loading || (user && !nav?.key)) return null;
  if (user) return null; // redirect just fired

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: "100%", maxWidth: 480, gap: 12, alignItems: "center" }}>
          <Text size="2xl" weight="bold" align="center">Oli</Text>
          <Text tone="muted" align="center">Sign in to get started</Text>

          <Link href="/(auth)/signin" asChild>
            <Button label="Continue" />
          </Link>

          <Link href="/dev" asChild>
            <Button variant="ghost" label="Dev Console" />
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
