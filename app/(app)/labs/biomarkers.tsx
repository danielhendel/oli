import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useLabResults } from "@/lib/data/useLabResults";
import type { LabResultDto } from "@/lib/contracts";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function BiomarkersScreen() {
  const router = useRouter();
  const labResults = useLabResults();
  const { status, refetch } = labResults;

  return (
    <ModuleScreenShell title="Biomarkers" subtitle="Individual markers">
      <Pressable
        onPress={() => router.push("/(app)/labs/log")}
        accessibilityRole="button"
        accessibilityLabel="Log biomarkers"
        style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>Log biomarkers</Text>
      </Pressable>

      {status === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {status === "error" && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Failed to load lab results</Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {status === "ready" && labResults.data && (
        <View style={styles.list}>
          {labResults.data.items.length === 0 ? (
            <Text style={styles.emptyText}>No lab results yet. Tap "Log biomarkers" to add your first.</Text>
          ) : (
            labResults.data.items.map((item: LabResultDto) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/(app)/labs/lab-result/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`View lab result from ${formatDate(item.collectedAt)}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{formatDate(item.collectedAt)}</Text>
                  <Text style={styles.rowSubtitle}>
                    {item.biomarkers.length} biomarker{item.biomarkers.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  ctaButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  center: { alignItems: "center", paddingVertical: 24, gap: 12 },
  loadingText: { fontSize: 14, opacity: 0.7 },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  errorText: { color: "#B00020", fontSize: 14, fontWeight: "600" },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#B00020",
    borderRadius: 8,
  },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  list: { gap: 10, marginTop: 16 },
  emptyText: { fontSize: 14, opacity: 0.7, paddingVertical: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
  },
  rowPressed: { opacity: 0.85 },
  rowLeft: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowSubtitle: { fontSize: 13, opacity: 0.7 },
  chevron: { fontSize: 22, opacity: 0.5, paddingLeft: 6 },
});
