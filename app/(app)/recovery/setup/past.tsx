// app/(app)/recovery/setup/past.tsx
import React from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DetailHeader from "@/components/layout/DetailHeader";
import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchRecentEventsByType, type RecentEvent } from "@/lib/logging/fetchRecent";
import { encodePrefill } from "@/lib/logging/prefill";
import { toYMD } from "@/lib/util/date";

export default function RecoveryPast() {
  const { ymd } = useLocalSearchParams<{ ymd?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = React.useState<RecentEvent[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      try {
        const rows = await fetchRecentEventsByType(user.uid, "recovery", 30);
        setItems(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [user?.uid]);

  function onBack() {
    const day = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());
    router.replace({ pathname: "/recovery", params: { focusYmd: day } });
  }

  function selectPast(payload: unknown) {
    const prefill = encodePrefill(payload);
    router.push({ pathname: "/recovery/log/manual", params: { ymd, prefill } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <DetailHeader title="Copy From Past" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {error ? (
          <Card variant="elevated" radius="lg" padding="lg">
            <Text tone="danger">{error}</Text>
          </Card>
        ) : null}
        {items.length === 0 ? (
          <Card variant="elevated" radius="lg" padding="lg">
            <Text>No recent recovery yet.</Text>
          </Card>
        ) : (
          items.map((it) => (
            <Card key={it.id} variant="elevated" radius="lg" padding="lg" style={{ gap: 8 }}>
              <Text weight="medium">{it.ymd}</Text>
              <Text tone="muted" size="sm">Reuse this recovery</Text>
              <Button variant="secondary" label="Use" onPress={() => selectPast(it.payload)} />
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
