import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useLabResult } from "@/lib/data/useLabResult";
import type { BiomarkerReadingDto } from "@/lib/contracts";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LabResultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const labResult = useLabResult(id ?? "");
  const { status, refetch } = labResult;

  if (status === "loading") {
    return (
      <ModuleScreenShell title="Lab result" subtitle="Loading…">
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </ModuleScreenShell>
    );
  }

  if (status === "missing") {
    return (
      <ModuleScreenShell title="Lab result" subtitle="Not found">
        <Text style={styles.errorText}>Lab result not found.</Text>
      </ModuleScreenShell>
    );
  }

  if (status === "error" && "error" in labResult) {
    return (
      <ModuleScreenShell title="Lab result" subtitle="Error">
        <Text style={styles.errorText}>{labResult.error}</Text>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </ModuleScreenShell>
    );
  }

  const lab = labResult.data;

  return (
    <ModuleScreenShell title="Lab result" subtitle={formatDate(lab.collectedAt)}>
      <View style={styles.card}>
        <Text style={styles.metaText}>Collected: {formatDate(lab.collectedAt)}</Text>
        {lab.sourceRawEventId ? (
          <Text style={styles.metaText}>Source: {lab.sourceRawEventId}</Text>
        ) : null}

        <Text style={[styles.label, { marginTop: 16 }]}>Biomarkers</Text>
        <View style={styles.table}>
          {lab.biomarkers.map((b: BiomarkerReadingDto, i: number) => (
            <View key={i} style={styles.biomarkerRow}>
              <Text style={styles.biomarkerName}>{b.name}</Text>
              <Text style={styles.biomarkerValue}>
                {b.value} {b.unit}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: 24 },
  errorText: { color: "#B00020", fontSize: 14, fontWeight: "600" },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#B00020",
    borderRadius: 8,
  },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
  },
  metaText: { fontSize: 13, opacity: 0.8 },
  label: { fontSize: 13, fontWeight: "700", color: "#111827" },
  table: { marginTop: 8, gap: 8 },
  biomarkerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  biomarkerName: { fontSize: 15, fontWeight: "600" },
  biomarkerValue: { fontSize: 14, opacity: 0.8 },
});
