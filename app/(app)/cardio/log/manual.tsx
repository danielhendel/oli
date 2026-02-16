// app/(app)/cardio/log/manual.tsx
import React, { useEffect, useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";

import { useAuth } from "@/lib/auth/AuthContext";
import { toYMD } from "@/lib/util/date";
import { saveLog } from "@/lib/logging/saveLog";
import Card from "@/lib/ui/Card";
import Button from "@/lib/ui/Button";
import FormRow from "@/components/forms/FormRow";
import NumberInput from "@/components/forms/NumberInput";
import { Text } from "@/lib/ui/Text";
import DetailHeader from "@/components/layout/DetailHeader";
import { decodePrefill } from "@/lib/logging/prefill";
import { emit } from "@/lib/ui/eventBus"; // ⬅ optimistic signal

type Modality = "run" | "row" | "swim" | "cycle";
type CardioPayload = { modality?: Modality; distanceKm?: number; durationMs?: number; rpe?: number };
type Issue = { path?: string; message?: string };

export default function CardioManual() {
  const { ymd, prefill } = useLocalSearchParams<{ ymd?: string; prefill?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const chosenDay = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());

  const [modality, setModality] = useState<Modality>("run");
  const [distanceKm, setDistanceKm] = useState<number>(5);
  const [durationMin, setDurationMin] = useState<number>(30);
  const [rpe, setRpe] = useState<number>(7);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Prefill from Templates/Past (if provided)
  useEffect(() => {
    const p = decodePrefill<CardioPayload>(prefill);
    if (!p) return;
    if (p.modality) setModality(p.modality);
    if (typeof p.distanceKm === "number") setDistanceKm(p.distanceKm);
    if (typeof p.durationMs === "number") setDurationMin(Math.round(p.durationMs / 60000));
    if (typeof p.rpe === "number") setRpe(p.rpe);
  }, [prefill]);

  function onBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      const href = { pathname: "/cardio", params: { focusYmd: chosenDay } } satisfies Href;
      router.replace(href);
    }
  }

  async function onSave() {
    if (!user?.uid) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await saveLog(
        "cardio",
        { modality, distanceKm, durationMs: durationMin * 60_000, rpe },
        user.uid,
        { ymd: chosenDay },
      );
      if (!res.ok) {
        const first: Issue | undefined = Array.isArray(res.issues) ? res.issues[0] : undefined;
        throw new Error(first?.message || "Save failed");
      }

      // ⬇ optimistic UI signal
      emit("log:saved", { type: "cardio", ymd: chosenDay });

      const href = { pathname: "/(app)/cardio/day/[ymd]", params: { ymd: chosenDay } } satisfies Href;
      router.replace(href);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <DetailHeader title="New Cardio" onBack={onBack} />
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {err ? (
            <Card variant="elevated" padding="md" radius="xl">
              <Text tone="danger">{err}</Text>
            </Card>
          ) : null}

          <Card variant="elevated" padding="lg" radius="xl">
            <Text weight="bold">Details</Text>
            <View style={{ height: 12 }} />

            <FormRow label="Distance (km)">
              <NumberInput value={distanceKm} min={0} onChange={(n) => setDistanceKm(n ?? 0)} placeholder="e.g. 5" />
            </FormRow>

            <FormRow label="Duration (minutes)">
              <NumberInput value={durationMin} min={0} onChange={(n) => setDurationMin(n ?? 0)} placeholder="e.g. 30" />
            </FormRow>

            <FormRow label="RPE">
              <NumberInput value={rpe} min={1} max={10} onChange={(n) => setRpe(n ?? 7)} placeholder="1–10" />
            </FormRow>
          </Card>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label={saving ? "Saving…" : "Save"} onPress={onSave} disabled={saving} />
            <Button variant="ghost" label="Cancel" onPress={onBack} disabled={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
