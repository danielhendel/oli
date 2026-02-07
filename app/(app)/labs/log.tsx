import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createLabResult } from "@/lib/api/usersMe";
import type { BiomarkerReadingDto } from "@/lib/contracts";

// Generate deterministic idempotency key from payload (v0: use uuid-like from timestamp + random)
function makeIdempotencyKey(): string {
  return `lab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const emptyBiomarker: BiomarkerReadingDto = { name: "", value: 0, unit: "" };

export default function LogBiomarkersScreen() {
  const router = useRouter();
  const { user, initializing, getIdToken } = useAuth();

  const [collectedAt, setCollectedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [sourceRawEventId, setSourceRawEventId] = useState("");
  const [biomarkers, setBiomarkers] = useState<BiomarkerReadingDto[]>([{ ...emptyBiomarker }]);
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "saving" }
    | { state: "error"; message: string }
    | { state: "saved"; id: string }
  >({ state: "idle" });

  const addRow = useCallback(() => {
    setBiomarkers((prev) => [...prev, { ...emptyBiomarker }]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setBiomarkers((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateBiomarker = useCallback((index: number, field: keyof BiomarkerReadingDto, value: string | number) => {
    setBiomarkers((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    );
  }, []);

  const validBiomarkers = useMemo(() => {
    return biomarkers.filter(
      (b) =>
        typeof b.name === "string" &&
        b.name.trim().length > 0 &&
        Number.isFinite(b.value) &&
        typeof b.unit === "string" &&
        b.unit.trim().length > 0,
    );
  }, [biomarkers]);

  const canSave =
    !initializing &&
    Boolean(user) &&
    validBiomarkers.length >= 1 &&
    status.state !== "saving" &&
    !Number.isNaN(new Date(collectedAt).getTime());

  const onSave = useCallback(async () => {
    if (!canSave) return;

    setStatus({ state: "saving" });

    try {
      if (!user) {
        setStatus({ state: "error", message: "Not signed in." });
        return;
      }

      const token = await getIdToken(false);
      if (!token) {
        setStatus({ state: "error", message: "No auth token (try Debug → Re-auth)" });
        return;
      }

      const isoCollectedAt = new Date(collectedAt).toISOString();
      const payload = {
        collectedAt: isoCollectedAt,
        ...(sourceRawEventId.trim() ? { sourceRawEventId: sourceRawEventId.trim() } : {}),
        biomarkers: validBiomarkers.map((b) => ({
          name: b.name.trim(),
          value: Number(b.value),
          unit: b.unit.trim(),
        })),
      };

      const idempotencyKey = makeIdempotencyKey();
      const res = await createLabResult(payload, token, idempotencyKey);

      if (!res.ok) {
        const msg =
          res.kind === "http" && res.json && typeof res.json === "object" && "error" in res.json
            ? (res.json as { error?: { code?: string } }).error?.code ?? res.error
            : res.error;
        setStatus({ state: "error", message: `Failed: ${msg}` });
        return;
      }

      setStatus({ state: "saved", id: res.json.id });
      Alert.alert("Saved", "Lab result saved successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/(app)/labs/biomarkers"),
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setStatus({ state: "error", message: msg });
    }
  }, [canSave, user, getIdToken, collectedAt, sourceRawEventId, validBiomarkers, router]);

  return (
    <ModuleScreenShell title="Log biomarkers" subtitle="Manual entry">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Collected at</Text>
        <TextInput
          value={collectedAt}
          onChangeText={setCollectedAt}
          style={styles.input}
          placeholder="YYYY-MM-DDTHH:mm"
          accessibilityLabel="Collected at date and time"
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Source raw event ID (optional)</Text>
        <TextInput
          value={sourceRawEventId}
          onChangeText={setSourceRawEventId}
          style={styles.input}
          placeholder="e.g. rawEvent_abc123"
          accessibilityLabel="Source raw event ID"
        />

        <View style={styles.biomarkersHeader}>
          <Text style={styles.label}>Biomarkers</Text>
          <Pressable onPress={addRow} accessibilityRole="button" style={styles.addButton}>
            <Text style={styles.addText}>+ Add</Text>
          </Pressable>
        </View>

        {biomarkers.map((b, i) => (
          <View key={i} style={styles.biomarkerRow}>
            <TextInput
              value={b.name}
              onChangeText={(v) => updateBiomarker(i, "name", v)}
              style={[styles.input, styles.inputSmall]}
              placeholder="Name"
            />
            <TextInput
              value={b.value === 0 && b.name === "" && b.unit === "" ? "" : String(b.value)}
              onChangeText={(v) => updateBiomarker(i, "value", v === "" ? 0 : Number(v))}
              style={[styles.input, styles.inputSmall]}
              placeholder="Value"
              keyboardType="decimal-pad"
            />
            <TextInput
              value={b.unit}
              onChangeText={(v) => updateBiomarker(i, "unit", v)}
              style={[styles.input, styles.inputSmall]}
              placeholder="Unit"
            />
            <Pressable
              onPress={() => removeRow(i)}
              disabled={biomarkers.length <= 1}
              accessibilityRole="button"
              style={[styles.removeButton, biomarkers.length <= 1 && styles.removeDisabled]}
            >
              <Text style={styles.removeText}>−</Text>
            </Pressable>
          </View>
        ))}

        {validBiomarkers.length < 1 && biomarkers.some((b) => b.name || b.unit) ? (
          <Text style={styles.helperError}>At least one biomarker needs name, value, and unit.</Text>
        ) : null}

        <Pressable
          onPress={() => void onSave()}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save lab result"
          style={({ pressed }) => [
            styles.saveButton,
            !canSave && styles.saveDisabled,
            pressed && canSave && { opacity: 0.9 },
          ]}
        >
          {status.state === "saving" ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>

        {status.state === "error" ? (
          <Text style={styles.helperError}>{status.message}</Text>
        ) : null}
      </ScrollView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: "700", color: "#111827" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 6,
  },
  inputSmall: { flex: 1, marginTop: 0 },
  biomarkersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },
  addText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  biomarkerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  removeButton: {
    width: 36,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  removeDisabled: { opacity: 0.4 },
  removeText: { fontSize: 18, fontWeight: "700", color: "#B00020" },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveDisabled: { opacity: 0.35 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  helperError: { color: "#B00020", fontSize: 12, fontWeight: "600", marginTop: 8 },
});
