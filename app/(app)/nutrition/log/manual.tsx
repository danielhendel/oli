// app/(app)/nutrition/log/manual.tsx
import React, { useEffect, useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";

import { Text } from "@/lib/ui/Text";
import Card from "@/lib/ui/Card";
import Button from "@/lib/ui/Button";
import FormRow from "@/components/forms/FormRow";
import NumberInput from "@/components/forms/NumberInput";
import DetailHeader from "@/components/layout/DetailHeader";
import { saveLog } from "@/lib/logging/saveLog";
import { useAuth } from "@/lib/auth/AuthContext";
import { toYMD } from "@/lib/util/date";
import { decodePrefill } from "@/lib/logging/prefill";
import { emit } from "@/lib/ui/eventBus";

type NutritionDraft = {
  totals?: { calories?: number; protein?: number };
  meals?: {
    breakfast?: { calories?: number; protein?: number };
    lunch?: { calories?: number; protein?: number };
    dinner?: { calories?: number; protein?: number };
    snacks?: { calories?: number; protein?: number };
  };
};

export default function NutritionManual() {
  const { ymd, prefill } = useLocalSearchParams<{ ymd?: string; prefill?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const chosenDay = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());

  const [calories, setCalories] = useState<number>(2000);
  const [protein, setProtein] = useState<number>(150);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = decodePrefill<NutritionDraft>(prefill);
    if (!p) return;
    if (typeof p?.totals?.calories === "number") setCalories(p.totals.calories);
    if (typeof p?.totals?.protein === "number") setProtein(p.totals.protein);
  }, [prefill]);

  function onBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      const href = { pathname: "/nutrition", params: { focusYmd: chosenDay } } satisfies Href;
      router.replace(href);
    }
  }

  async function onSave() {
    if (!user?.uid) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await saveLog(
        "nutrition",
        { totals: { calories, protein } },
        user.uid,
        { ymd: chosenDay },
      );
      if (!res.ok) throw new Error((res.issues?.[0]?.message as string) || "Save failed");

      emit("log:saved", { type: "nutrition", ymd: chosenDay });

      const href = { pathname: "/(app)/nutrition/day/[ymd]", params: { ymd: chosenDay } } satisfies Href;
      router.replace(href);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <DetailHeader title="New Nutrition Log" onBack={onBack} />
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {err ? (
            <Card variant="elevated" padding="md" radius="xl">
              <Text tone="danger">{err}</Text>
            </Card>
          ) : null}

          <Card variant="elevated" padding="lg" radius="xl">
            <Text weight="bold">Totals</Text>
            <View style={{ height: 12 }} />

            <FormRow label="Calories">
              <NumberInput value={calories} min={0} onChange={(n) => setCalories(n ?? 0)} placeholder="e.g. 2000" />
            </FormRow>

            <FormRow label="Protein (g)">
              <NumberInput value={protein} min={0} onChange={(n) => setProtein(n ?? 0)} placeholder="e.g. 150" />
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
