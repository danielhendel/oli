// lib/ui/WeightLogModal.tsx — Manual weight entry modal (bottom-sheet style).
import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from "react-native";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logWeight } from "@/lib/api/usersMe";
import { buildManualWeightPayload } from "@/lib/events/manualWeight";
import { emitRefresh } from "@/lib/navigation/refreshBus";

const LBS_PER_KG = 2.2046226218;

function getDeviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export type WeightLogModalProps = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function WeightLogModal({ visible, onClose, onSaved }: WeightLogModalProps) {
  const { user, initializing, getIdToken } = useAuth();
  const { state: prefState } = usePreferences();
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [unitTouched, setUnitTouched] = useState(false);
  const [weightText, setWeightText] = useState("");
  const [bodyFatText, setBodyFatText] = useState("");
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "saving" }
    | { state: "error"; message: string }
    | { state: "saved" }
  >({ state: "idle" });

  useEffect(() => {
    if (!unitTouched && prefState.preferences?.units?.mass) {
      setUnit(prefState.preferences.units.mass);
    }
  }, [prefState.preferences?.units?.mass, unitTouched]);

  useEffect(() => {
    if (!visible) {
      setWeightText("");
      setBodyFatText("");
      setStatus({ state: "idle" });
    }
  }, [visible]);

  const parsed = useMemo(() => {
    const w = Number(weightText);
    const bfRaw = bodyFatText.trim() === "" ? null : Number(bodyFatText);
    const weightOk = Number.isFinite(w) && w > 0;
    const bfOk = bfRaw === null || (Number.isFinite(bfRaw) && bfRaw >= 0 && bfRaw <= 100);
    const weightLbs = weightOk ? (unit === "lb" ? w : w * LBS_PER_KG) : null;
    const weightKg = weightOk ? (unit === "kg" ? w : w / LBS_PER_KG) : null;
    return { weightOk, bfOk, weightLbs, weightKg, bodyFatPercent: bfRaw };
  }, [weightText, bodyFatText, unit]);

  const canSave =
    !initializing &&
    Boolean(user) &&
    parsed.weightOk &&
    parsed.bfOk &&
    parsed.weightLbs != null &&
    parsed.weightKg != null &&
    status.state !== "saving";

  const onSave = async () => {
    if (!canSave || parsed.weightLbs == null || parsed.weightKg == null) return;
    setStatus({ state: "saving" });
    try {
      const token = await getIdToken(false);
      if (!token) {
        setStatus({ state: "error", message: "No auth token" });
        return;
      }
      const time = new Date().toISOString();
      const timezone = getDeviceTimeZone();
      const payload = buildManualWeightPayload({
        time,
        timezone,
        weightLbs: parsed.weightLbs,
        ...(parsed.bodyFatPercent != null ? { bodyFatPercent: parsed.bodyFatPercent } : {}),
      });
      const res = await logWeight(payload, token);
      if (!res.ok) {
        setStatus({ state: "error", message: res.error });
        return;
      }
      setStatus({ state: "saved" });
      emitRefresh("commandCenter", `${Date.now()}`, { optimisticWeightKg: parsed.weightKg });
      onSaved();
      onClose();
    } catch (e) {
      setStatus({ state: "error", message: e instanceof Error ? e.message : "Unknown error" });
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close modal">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Log weight</Text>
          <Text style={styles.label}>Weight</Text>
          <View style={styles.row}>
            <TextInput
              value={weightText}
              onChangeText={setWeightText}
              keyboardType="decimal-pad"
              placeholder={unit === "lb" ? "e.g. 185.2" : "e.g. 84.0"}
              style={[styles.input, { flex: 1 }]}
              accessibilityLabel="Weight"
            />
            <View style={styles.unitGroup}>
              <Pressable
                onPress={() => { setUnitTouched(true); setUnit("lb"); }}
                style={[styles.unitBtn, unit === "lb" && styles.unitActive]}
                accessibilityRole="button"
                accessibilityLabel="Pounds"
              >
                <Text style={[styles.unitText, unit === "lb" && styles.unitTextActive]}>lb</Text>
              </Pressable>
              <Pressable
                onPress={() => { setUnitTouched(true); setUnit("kg"); }}
                style={[styles.unitBtn, unit === "kg" && styles.unitActive]}
                accessibilityRole="button"
                accessibilityLabel="Kilograms"
              >
                <Text style={[styles.unitText, unit === "kg" && styles.unitTextActive]}>kg</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.label}>Body fat % (optional)</Text>
          <TextInput
            value={bodyFatText}
            onChangeText={setBodyFatText}
            keyboardType="decimal-pad"
            placeholder="e.g. 18.5"
            style={styles.input}
            accessibilityLabel="Body fat percentage"
          />
          {status.state === "error" ? <Text style={styles.error}>{status.message}</Text> : null}
          <Pressable
            onPress={() => void onSave()}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Save"
          >
            <Text style={styles.saveText}>{status.state === "saving" ? "Saving…" : "Save"}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  handle: { width: 36, height: 4, backgroundColor: "#C7C7CC", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: "#1C1C1E", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: "#1C1C1E", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  unitGroup: { flexDirection: "row", backgroundColor: "#F2F2F7", borderRadius: 12, overflow: "hidden" },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  unitActive: { backgroundColor: "#1C1C1E" },
  unitText: { fontSize: 14, fontWeight: "700", color: "#1C1C1E" },
  unitTextActive: { color: "#FFFFFF" },
  error: { color: "#B00020", fontSize: 12, marginBottom: 8 },
  saveBtn: { backgroundColor: "#1C1C1E", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
  cancelText: { fontSize: 15, color: "#6E6E73", fontWeight: "600" },
});
