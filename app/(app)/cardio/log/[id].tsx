// app/(app)/cardio/log/[id].tsx
import React, { useEffect, useState } from "react";
import { View, ScrollView, Alert, BackHandler } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthContext";
import { readEventById } from "@/lib/logging/readOne";
import { updateCardioEvent, deleteEventById } from "@/lib/logging/mutateEvent";
import type { EventDoc } from "@/lib/logging/types";
import { createTemplate } from "@/lib/logging/templates";
import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";
import NumberInput from "@/components/forms/NumberInput";
import DetailHeader from "@/components/layout/DetailHeader";
import ActionBar from "@/components/layout/ActionBar";
import { toYMD } from "@/lib/util/date";

type Modality = "run" | "row" | "swim" | "cycle";

export default function CardioLogDetail() {
  const { id, ymd: ymdParam } = useLocalSearchParams<{ id: string; ymd?: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [doc, setDoc] = useState<EventDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [distanceKm, setDistanceKm] = useState(0);
  const [durationMin, setDurationMin] = useState(0);
  const [rpe, setRpe] = useState(7);
  const [modality, setModality] = useState<Modality>("run");

  useEffect(() => {
    let live = true;
    (async () => {
      if (!user?.uid || !id) return;
      try {
        const d = await readEventById(user.uid, id);
        if (!live) return;
        setDoc(d);
        if (d?.type === "cardio") {
          const p = (d.payload ?? {}) as {
            modality?: Modality;
            distanceKm?: number;
            durationMs?: number;
            rpe?: number;
          };
          setModality(p.modality ?? "run");
          setDistanceKm(p.distanceKm ?? 0);
          setDurationMin(Math.round((p.durationMs ?? 0) / 60000));
          setRpe(p.rpe ?? 7);
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
    router.replace({ pathname: "/cardio/day/[ymd]", params: { ymd: focusYmd } });
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

  const title = "Cardio";
  const ymd = focusYmd;

  async function onSaveAsTemplate() {
    if (!user?.uid || !doc || doc.type !== "cardio") return;
    const payload = {
      modality,
      distanceKm,
      durationMs: durationMin * 60_000,
      rpe,
    };
    const name = `${payload.modality} — ${Math.round(payload.distanceKm ?? 0)} km`;
    try {
      await createTemplate(user.uid, "cardio", name, payload);
      Alert.alert("Saved", "Added to Cardio Templates.");
    } catch (e) {
      Alert.alert("Couldn’t save template", e instanceof Error ? e.message : String(e));
    }
  }

  async function save() {
    if (!user?.uid || !id) return;
    await updateCardioEvent(user.uid, id, {
      modality,
      distanceKm,
      rpe,
      durationMs: durationMin * 60_000,
    });
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
          <Text>
            {modality} — {distanceKm} km, {durationMin} min, RPE {rpe}
          </Text>
        </Card>

        {!editing ? (
          <Card variant="elevated" radius="lg" padding="lg" style={{ gap: 8, marginTop: 12 }}>
            <Text weight="medium">Session Details</Text>
            <Text tone="muted">Distance: {distanceKm} km</Text>
            <Text tone="muted">Duration: {durationMin} min</Text>
            <Text tone="muted">RPE: {rpe}</Text>
          </Card>
        ) : (
          <Card variant="elevated" radius="lg" padding="lg" style={{ gap: 12, marginTop: 12 }}>
            <Text size="lg" weight="medium">Edit Cardio</Text>
            <NumberInput
              value={distanceKm}
              min={0}
              placeholder="Distance (km)"
              onChange={(n?: number) => setDistanceKm(n ?? 0)}
            />
            <NumberInput
              value={durationMin}
              min={0}
              placeholder="Duration (min)"
              onChange={(n?: number) => setDurationMin(n ?? 0)}
            />
            <NumberInput
              value={rpe}
              min={1}
              max={10}
              placeholder="RPE (1–10)"
              onChange={(n?: number) => setRpe(n ?? 7)}
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
