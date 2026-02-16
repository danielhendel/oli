// app/(app)/recovery/log/[id].tsx
import React from "react";
import { View, ScrollView, Alert, BackHandler } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthContext";
import { readEventById } from "@/lib/logging/readOne";
import { updateRecoveryEvent, deleteEventById } from "@/lib/logging/mutateEvent";
import type { EventDoc } from "@/lib/logging/types";
import { createTemplate } from "@/lib/logging/templates";
import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";
import NumberInput from "@/components/forms/NumberInput";
import DetailHeader from "@/components/layout/DetailHeader";
import ActionBar from "@/components/layout/ActionBar";
import { toYMD } from "@/lib/util/date";

export default function RecoveryLogDetail() {
  const { id, ymd: ymdParam } = useLocalSearchParams<{ id: string; ymd?: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [doc, setDoc] = React.useState<EventDoc | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const [sleepMin, setSleepMin] = React.useState(0);
  const [hrv, setHrv] = React.useState(0);
  const [rhr, setRhr] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    (async () => {
      if (!user?.uid || !id) return;
      try {
        const d = await readEventById(user.uid, id);
        if (!live) return;
        setDoc(d);
        if (d?.type === "recovery") {
          const p = (d.payload ?? {}) as { sleepMin?: number; hrv?: number; rhr?: number };
          setSleepMin(p.sleepMin ?? 0);
          setHrv(p.hrv ?? 0);
          setRhr(p.rhr ?? 0);
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [user?.uid, id]);

  const focusYmd = React.useMemo(() => {
    if (typeof ymdParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymdParam)) return ymdParam;
    const fromDoc = (doc && (doc as unknown as { ymd?: string }).ymd) || undefined;
    return fromDoc ?? toYMD(new Date());
  }, [ymdParam, doc]);

  const onBackToDay = React.useCallback(() => {
    router.replace({ pathname: "/recovery/day/[ymd]", params: { ymd: focusYmd } });
  }, [router, focusYmd]);

  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onBackToDay();
        return true;
      });
      return () => sub.remove();
    }, [onBackToDay])
  );

  const title = "Recovery";
  const ymd = focusYmd;

  async function onSaveAsTemplate() {
    if (!user?.uid || !doc || doc.type !== "recovery") return;
    const payload = { sleepMin, hrv, rhr };
    const name = `Recovery — ${payload.sleepMin} min sleep`;
    try {
      await createTemplate(user.uid, "recovery", name, payload);
      Alert.alert("Saved", "Added to Recovery Templates.");
    } catch (e) {
      Alert.alert("Couldn’t save template", e instanceof Error ? e.message : String(e));
    }
  }

  async function save() {
    if (!user?.uid || !id) return;
    await updateRecoveryEvent(user.uid, id, { sleepMin, hrv, rhr });
    setEditing(false);
    const fresh = await readEventById(user.uid, id);
    setDoc(fresh);
  }

  function confirmDelete() {
    if (!user?.uid || !id) return;
    Alert.alert("Delete log?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEventById(user.uid!, id);
          onBackToDay();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader title={title} onBack={onBackToDay} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {error ? (
          <Card variant="elevated" radius="lg" padding="lg">
            <Text tone="danger">{error}</Text>
          </Card>
        ) : null}

        <Card variant="elevated" radius="xl" padding="lg" style={{ gap: 6 }}>
          <Text size="xl" weight="bold">{title}</Text>
          <Text tone="muted">{ymd}</Text>
          <Text>{sleepMin} min sleep · HRV {hrv} · RHR {rhr}</Text>
        </Card>

        {!editing ? (
          <Card variant="elevated" radius="lg" padding="lg" style={{ gap: 8, marginTop: 12 }}>
            <Text weight="medium">Recovery Details</Text>
            <Text tone="muted">Sleep: {sleepMin} min</Text>
            <Text tone="muted">HRV: {hrv}</Text>
            <Text tone="muted">RHR: {rhr}</Text>
          </Card>
        ) : (
          <Card variant="elevated" radius="lg" padding="lg" style={{ gap: 12, marginTop: 12 }}>
            <Text size="lg" weight="medium">Edit Recovery</Text>
            <NumberInput value={sleepMin} min={0} placeholder="Sleep (min)" onChange={(n?: number) => setSleepMin(n ?? 0)} />
            <NumberInput value={hrv} min={0} placeholder="HRV" onChange={(n?: number) => setHrv(n ?? 0)} />
            <NumberInput value={rhr} min={0} placeholder="RHR" onChange={(n?: number) => setRhr(n ?? 0)} />
          </Card>
        )}
      </ScrollView>

      <ActionBar
        left={[]}
        right={
          !editing
            ? [
                { label: "Save as Template", onPress: onSaveAsTemplate },
                { label: "Edit", onPress: () => setEditing(true) },
                { label: "Delete", onPress: confirmDelete, variant: "ghost" },
              ]
            : [
                { label: "Save", onPress: save, variant: "primary" },
                { label: "Cancel", onPress: () => setEditing(false), variant: "ghost" },
              ]
        }
      />
    </View>
  );
}
