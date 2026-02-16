// app/(app)/recovery/setup/templates.tsx
import React from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DetailHeader from "@/components/layout/DetailHeader";
import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchTemplatesByType, TemplateDoc } from "@/lib/logging/templates";
import { encodePrefill } from "@/lib/logging/prefill";
import { toYMD } from "@/lib/util/date";

type RecoveryPayload = { sleepMin?: number; hrv?: number; rhr?: number; notes?: string };

export default function RecoveryTemplates() {
  const { ymd } = useLocalSearchParams<{ ymd?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = React.useState<Array<TemplateDoc<RecoveryPayload>>>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      try {
        const t = await fetchTemplatesByType<RecoveryPayload>(user.uid, "recovery");
        setItems(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [user?.uid]);

  function onBack() {
    const day = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());
    router.replace({ pathname: "/recovery", params: { focusYmd: day } });
  }

  function selectTemplate(t: TemplateDoc<RecoveryPayload>) {
    const prefill = encodePrefill<RecoveryPayload>(t.payload);
    router.push({ pathname: "/recovery/log/manual", params: { ymd, prefill } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <DetailHeader title="Recovery Templates" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {error ? (
          <Card variant="elevated" radius="lg" padding="lg">
            <Text tone="danger">{error}</Text>
          </Card>
        ) : null}
        {items.length === 0 ? (
          <Card variant="elevated" radius="lg" padding="lg">
            <Text>No templates yet.</Text>
          </Card>
        ) : (
          items.map((t) => (
            <Card key={t.id} variant="elevated" radius="lg" padding="lg" style={{ gap: 8 }}>
              <Text size="lg" weight="medium">{t.name}</Text>
              <Button variant="secondary" label="Use" onPress={() => selectTemplate(t)} />
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
