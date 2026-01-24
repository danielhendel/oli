// app/(app)/body/weight.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logWeight } from "@/lib/api/usersMe";
import { buildManualWeightPayload } from "@/lib/events/manualWeight";
import { emitRefresh } from "@/lib/navigation/refreshBus";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

const LBS_PER_KG = 2.2046226218;

const getDeviceTimeZone = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
};

function makeRefreshKey(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function BodyWeightScreen() {
  const router = useRouter();
  const { user, initializing, getIdToken } = useAuth();
  const { state: prefState } = usePreferences();

  // Default unit comes from preferences, but we must never override user toggles on this screen.
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [unitTouched, setUnitTouched] = useState(false);

  const [weightText, setWeightText] = useState("");
  const [bodyFatText, setBodyFatText] = useState("");
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "saving" }
    | { state: "error"; message: string }
    | { state: "saved"; rawEventId: string }
  >({ state: "idle" });

  // Apply preferred unit once (or whenever prefs change) ONLY if user hasn't touched unit toggle here.
  useEffect(() => {
    if (unitTouched) return;
    const preferred = prefState.preferences.units.mass; // "lb" | "kg"
    setUnit(preferred);
  }, [prefState.preferences.units.mass, unitTouched]);

  const parsed = useMemo(() => {
    const w = Number(weightText);
    const bfRaw = bodyFatText.trim() === "" ? null : Number(bodyFatText);

    const weightOk = Number.isFinite(w) && w > 0;
    const bfOk = bfRaw === null || (Number.isFinite(bfRaw) && bfRaw >= 0 && bfRaw <= 100);

    const weightLbs = weightOk ? (unit === "lb" ? w : w * LBS_PER_KG) : null;
    const weightKg = weightOk ? (unit === "kg" ? w : w / LBS_PER_KG) : null;

    return {
      weightOk,
      bfOk,
      weightLbs,
      weightKg,
      bodyFatPercent: bfRaw === null ? null : bfRaw,
    };
  }, [weightText, bodyFatText, unit]);

  const canSave =
    !initializing &&
    Boolean(user) &&
    parsed.weightOk &&
    parsed.bfOk &&
    parsed.weightLbs !== null &&
    parsed.weightKg !== null &&
    status.state !== "saving";

  const onSave = async (): Promise<void> => {
    if (!canSave || parsed.weightLbs === null || parsed.weightKg === null) return;
    setStatus({ state: "saving" });

    try {
      if (initializing) {
        setStatus({ state: "error", message: "Auth still initializing. Try again." });
        return;
      }
      if (!user) {
        setStatus({ state: "error", message: "Not signed in." });
        return;
      }

      const token = await getIdToken(false);
      if (!token) {
        setStatus({ state: "error", message: "No auth token (try Debug → Re-auth)" });
        return;
      }

      const time = new Date().toISOString();
      const timezone = getDeviceTimeZone();

      const payload = buildManualWeightPayload({
        time,
        timezone,
        weightLbs: parsed.weightLbs,
        ...(parsed.bodyFatPercent !== null ? { bodyFatPercent: parsed.bodyFatPercent } : {}),
      });

      const res = await logWeight(payload, token);

      if (!res.ok) {
        setStatus({
          state: "error",
          message: `${res.error} (kind=${res.kind}, status=${res.status}, requestId=${res.requestId ?? "n/a"})`,
        });
        return;
      }

      setStatus({ state: "saved", rawEventId: res.json.rawEventId });

      const refreshKey = makeRefreshKey();

      // ✅ Bus payload: deterministic immediate CC update even if params don't update / screen stays mounted.
      emitRefresh("commandCenter", refreshKey, { optimisticWeightKg: parsed.weightKg });

      // ✅ Keep params as redundancy
      const ow = parsed.weightKg.toFixed(2);
      router.replace({
        pathname: "/(app)/command-center",
        params: { refresh: refreshKey, ow },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setStatus({ state: "error", message: msg });
    }
  };

  const onSelectUnit = (next: "lb" | "kg") => {
    setUnitTouched(true);
    setUnit(next);
  };

  return (
    <ModuleScreenShell title="Weight" subtitle="Daily weigh-ins & trends">
      <View style={styles.card}>
        <Text style={styles.label}>Weight</Text>

        <View style={styles.row}>
          <TextInput
            value={weightText}
            onChangeText={setWeightText}
            keyboardType="decimal-pad"
            placeholder={unit === "lb" ? "e.g. 185.2" : "e.g. 84.0"}
            style={[styles.input, { flex: 1 }]}
            accessibilityLabel="Weight input"
          />

          <View style={styles.unitGroup}>
            <Pressable
              onPress={() => onSelectUnit("lb")}
              accessibilityRole="button"
              accessibilityLabel="Use pounds"
              style={[styles.unitButton, unit === "lb" && styles.unitActive]}
            >
              <Text style={[styles.unitText, unit === "lb" && styles.unitTextActive]}>lb</Text>
            </Pressable>

            <Pressable
              onPress={() => onSelectUnit("kg")}
              accessibilityRole="button"
              accessibilityLabel="Use kilograms"
              style={[styles.unitButton, unit === "kg" && styles.unitActive]}
            >
              <Text style={[styles.unitText, unit === "kg" && styles.unitTextActive]}>kg</Text>
            </Pressable>
          </View>
        </View>

        {!parsed.weightOk && weightText.trim() !== "" ? (
          <Text style={styles.helperError}>Enter a valid number greater than 0.</Text>
        ) : null}

        <Text style={[styles.label, { marginTop: 14 }]}>Body fat % (optional)</Text>
        <TextInput
          value={bodyFatText}
          onChangeText={setBodyFatText}
          keyboardType="decimal-pad"
          placeholder="e.g. 18.5"
          style={styles.input}
          accessibilityLabel="Body fat percentage input"
        />

        {!parsed.bfOk ? <Text style={styles.helperError}>Body fat must be between 0 and 100.</Text> : null}

        <Pressable
          onPress={() => void onSave()}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save weight"
          style={({ pressed }) => [
            styles.saveButton,
            !canSave && styles.saveDisabled,
            pressed && canSave && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.saveText}>{status.state === "saving" ? "Saving…" : "Save"}</Text>
        </Pressable>

        {status.state === "error" ? <Text style={styles.helperError}>{status.message}</Text> : null}
        {status.state === "saved" ? (
          <Text style={styles.helperSuccess}>Saved (rawEventId: {status.rawEventId})</Text>
        ) : null}

        <Text style={styles.helperNote}>
          Daily facts may take a moment to update while the pipeline processes your raw event.
        </Text>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#F2F2F7", borderRadius: 16, padding: 14, gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: "#111827" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  unitGroup: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  unitButton: { paddingHorizontal: 12, paddingVertical: 12 },
  unitActive: { backgroundColor: "#111827" },
  unitText: { fontSize: 14, fontWeight: "800", color: "#111827" },
  unitTextActive: { color: "#FFFFFF" },
  saveButton: {
    marginTop: 10,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveDisabled: { opacity: 0.35 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  helperError: { color: "#B00020", fontSize: 12, fontWeight: "600" },
  helperSuccess: { color: "#1B5E20", fontSize: 12, fontWeight: "700" },
  helperNote: { marginTop: 8, color: "#6B7280", fontSize: 12, fontWeight: "600" },
});
