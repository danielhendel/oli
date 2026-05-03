import { UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

// app/(app)/settings/data-sources/metric/[metricId].tsx — Metric Source Picker (Slice 1)
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import {
  getMetricById,
  getAllowedSourcesForMetric,
  getSourceDisplayName,
} from "@/lib/metrics/dataSourcesConfig";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

export default function MetricSourcePickerScreen() {
  const { metricId } = useLocalSearchParams<{ metricId: string }>();
  const router = useRouter();
  const { state, setMetricSourcePreference } = usePreferences();
  const [saving, setSaving] = useState(false);

  const metric = metricId ? getMetricById(metricId) : undefined;
  const allowedSourceIds = metric ? getAllowedSourcesForMetric(metric.id) : [];
  const currentSourceId = (state.preferences.metricSources ?? {})[metric?.id ?? ""] ?? null;

  const handleSelect = async (sourceId: string | null) => {
    if (!metric) return;
    setSaving(true);
    try {
      await setMetricSourcePreference(metric.id, sourceId);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!metricId || !metric) {
    return (
      <ModuleScreenShell title="Source" subtitle="Metric not found.">
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Unknown metric.</Text>
        </View>
      </ModuleScreenShell>
    );
  }

  const options: { value: string | null; label: string }[] = [
    { value: null, label: "Use default" },
    ...allowedSourceIds.map((id) => ({ value: id, label: getSourceDisplayName(id) })),
  ];

  return (
    <ModuleScreenShell title={`Source for ${metric.label}`} subtitle="Choose which source Oli should use for this metric when multiple sources are available.">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.options}>
          {options.map((opt) => {
            const isSelected = (opt.value === null && currentSourceId === null) || opt.value === currentSourceId;
            return (
              <Pressable
                key={opt.value ?? "default"}
                onPress={() => handleSelect(opt.value)}
                disabled={saving}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{opt.label}</Text>
                {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {saving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator />
            <Text style={styles.savingText}>Saving…</Text>
          </View>
        ) : null}
        {state.status === "error" ? (
          <Text style={styles.errorText}>{state.message}</Text>
        ) : null}
      </ScrollView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  placeholder: { padding: 16 },
  placeholderText: { fontSize: 15, color: "#6B7280" },
  options: { gap: 10 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: UI_SCREEN_BG,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  optionRowSelected: {
    borderColor: "#1C1C1E",
    backgroundColor: "#E5E5EA",
  },
  optionLabel: { fontSize: 16, fontWeight: "500" },
  optionLabelSelected: { fontWeight: "700" },
  checkmark: { fontSize: 16, fontWeight: "700" },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  savingText: { fontSize: 15, color: "#6B7280" },
  errorText: { fontSize: 14, color: "#B00020", marginTop: 12 },
});
