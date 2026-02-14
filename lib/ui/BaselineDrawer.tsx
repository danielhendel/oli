// lib/ui/BaselineDrawer.tsx
// Phase 1.5 Sprint 3 — Multi-Baseline display (UI-only, no mutation)
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import {
  getGeneralBaselineContent,
  getPersonalBaselineContent,
  getOptimizationBaselineContent,
} from "@/lib/format/baselines";
import type { HealthScoreDoc } from "@/lib/contracts";

type Props = {
  visible: boolean;
  onClose: () => void;
  doc: HealthScoreDoc;
};

function BaselinePanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

export function BaselineDrawer({ visible, onClose, doc }: Props) {
  const general = getGeneralBaselineContent(doc);
  const personal = getPersonalBaselineContent(doc);
  const optimization = getOptimizationBaselineContent(doc);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Dismiss baselines"
        accessibilityRole="button"
      >
        <Pressable style={styles.drawer} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.heading}>Baselines</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <BaselinePanel title="General">
              <Text style={styles.rowLabel}>Date</Text>
              <Text style={styles.rowValue}>{general.date}</Text>
              <Text style={styles.rowLabel}>Computed</Text>
              <Text style={styles.rowValue}>{general.computedAt}</Text>
              <Text style={styles.rowLabel}>Status</Text>
              <Text style={styles.rowValue}>{general.status}</Text>
            </BaselinePanel>
            <BaselinePanel title="Personal">
              <Text style={styles.rowLabel}>History days used</Text>
              <Text style={styles.rowValue}>{String(personal.historyDaysUsed)}</Text>
              <Text style={styles.rowLabel}>Daily facts available</Text>
              <Text style={styles.rowValue}>{personal.hasDailyFacts ? "Yes" : "No"}</Text>
            </BaselinePanel>
            <BaselinePanel title="Optimization">
              <Text style={styles.rowLabel}>Model version</Text>
              <Text style={styles.rowValue}>{optimization.modelVersion}</Text>
              <Text style={styles.rowLabel}>Pipeline version</Text>
              <Text style={styles.rowValue}>{String(optimization.pipelineVersion)}</Text>
              <Text style={styles.rowLabel}>Schema version</Text>
              <Text style={styles.rowValue}>{String(optimization.schemaVersion)}</Text>
            </BaselinePanel>
          </ScrollView>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close baselines"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  drawer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    maxHeight: "85%",
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 20, paddingBottom: 8 },
  panel: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  panelContent: { gap: 4 },
  rowLabel: { fontSize: 13, color: "#8E8E93" },
  rowValue: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  closeButton: {
    marginTop: 16,
    alignSelf: "flex-end",
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
});
