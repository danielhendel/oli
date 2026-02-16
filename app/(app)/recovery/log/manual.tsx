// app/(app)/recovery/log/manual.tsx
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

type RecoveryDraft = { sleepMin?: number; hrv?: number; rhr?: number };

export default function RecoveryManual() {
  const { ymd, prefill } = useLocalSearchParams<{ ymd?: string; prefill?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const chosenDay = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());

  const [sleepMin, setSleepMin] = useState<number>(420);
  const [hrv, setHrv] = useState<number>(65);
  const [rhr, setRhr] = useState<number>(55);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = decodePrefill<RecoveryDraft>(prefill);
    if (!p) return;
    if (typeof p.sleepMin === "number") setSleepMin(p.sleepMin);
    if (typeof p.hrv === "number") setHrv(p.hrv);
    if (typeof p.rhr === "number") setRhr(p.rhr);
  }, [prefill]);

  function onBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      const href = { pathname: "/recovery", params: { focusYmd: chosenDay } } satisfies Href;
      router.replace(href);
    }
  }

  async function onSave() {
    if (!user?.uid) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await saveLog(
        "recovery",
        { sleepMin, hrv, rhr },
        user.uid,
        { ymd: chosenDay },
      );
      if (!res.ok) throw new Error((res.issues?.[0]?.message as string) || "Save failed");

      emit("log:saved", { type: "recovery", ymd: chosenDay });

      const href = { pathname: "/(app)/recovery/day/[ymd]", params: { ymd: chosenDay } } satisfies Href;
      router.replace(href);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <DetailHeader title="New Recovery" onBack={onBack} />
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

            <FormRow label="Sleep (minutes)">
              <NumberInput value={sleepMin} min={0} onChange={(n) => setSleepMin(n ?? 0)} placeholder="e.g. 420" />
            </FormRow>

            <FormRow label="HRV (ms)">
              <NumberInput value={hrv} min={0} onChange={(n) => setHrv(n ?? 0)} placeholder="e.g. 65" />
            </FormRow>

            <FormRow label="Resting HR (bpm)">
              <NumberInput value={rhr} min={0} onChange={(n) => setRhr(n ?? 0)} placeholder="e.g. 55" />
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
