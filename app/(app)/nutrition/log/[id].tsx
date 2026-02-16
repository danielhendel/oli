// app/(app)/nutrition/log/[id].tsx
import React from "react";
import { View, ScrollView, Alert, BackHandler } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthContext";
import { readEventById } from "@/lib/logging/readOne";
import { updateNutritionEvent, deleteEventById } from "@/lib/logging/mutateEvent";
import type { EventDoc } from "@/lib/logging/types";
import { createTemplate } from "@/lib/logging/templates";
import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";
import NumberInput from "@/components/forms/NumberInput";
import DetailHeader from "@/components/layout/DetailHeader";
import ActionBar from "@/components/layout/ActionBar";
import { toYMD } from "@/lib/util/date";

export default function NutritionLogDetail() {
  const { id, ymd: ymdParam } = useLocalSearchParams<{ id: string; ymd?: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [doc, setDoc] = React.useState<EventDoc | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const [calories, setCalories] = React.useState(0);
  const [protein, setProtein] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    (async () => {
      if (!user?.uid || !id) return;
      try {
        const d = await readEventById(user.uid, id);
        if (!live) return;
        setDoc(d);
        if (d?.type === "nutrition") {
          const p = (d.payload ?? {}) as { totals?: { calories?: number; protein?: number } };
          setCalories(p.totals?.calories ?? 0);
          setProtein(p.totals?.protein ?? 0);
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
    router.replace({ pathname: "/nutrition/day/[ymd]", params: { ymd: focusYmd } });
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

  const title = "Nutrition";
  const ymd = focusYmd;

  async function onSaveAsTemplate() {
    if (!user?.uid || !doc || doc.type !== "nutrition") return;
    const payload = { totals: { calories, protein } };
    const name = `Meal — ${payload.totals.calories ?? 0} kcal`;
    try {
      await createTemplate(user.uid, "nutrition", name, payload);
      Alert.alert("Saved", "Added to Nutrition Templates.");
    } catch (e) {
      Alert.alert("Couldn’t save template", e instanceof Error ? e.message : String(e));
    }
  }

  async function save() {
    if (!user?.uid || !id) return;
    await updateNutritionEvent(user.uid, id, { totals: { calories, protein } });
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
          <Text>{calories} kcal — {protein} g protein</Text>
        </Card>

        {!editing ? (
          <Card variant="elevated" radius="lg" padding="lg" style={{ gap: 8, marginTop: 12 }}>
            <Text weight="medium">Totals</Text>
            <Text tone="muted">Calories: {calories}</Text>
            <Text tone="muted">Protein: {protein} g</Text>
          </Card>
        ) : (
          <Card variant="elevated" radius="lg" padding="lg" style={{ gap: 12, marginTop: 12 }}>
            <Text size="lg" weight="medium">Edit Nutrition</Text>
            <NumberInput
              value={calories}
              min={0}
              placeholder="Calories (kcal)"
              onChange={(n?: number) => setCalories(n ?? 0)}
            />
            <NumberInput
              value={protein}
              min={0}
              placeholder="Protein (g)"
              onChange={(n?: number) => setProtein(n ?? 0)}
            />
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
