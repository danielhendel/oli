// lib/ui/ProvenanceDrawer.tsx
// Phase 1.5 Sprint 5 — Epistemic transparency (pure presentational; no fetch, no hooks, no API)

import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import type { ProvenanceViewModel } from "@/lib/contracts/provenance";

type Props = {
  visible: boolean;
  onClose: () => void;
  model: ProvenanceViewModel;
};

/** Format ISO date string for display only. No other computation. */
function formatComputedAt(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString();
}

export function ProvenanceDrawer({ visible, onClose, model }: Props) {
  const computedAtDisplay = formatComputedAt(model.computedAt);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.drawer} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.heading}>{model.title}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Model Version</Text>
              <Text style={styles.rowValue}>{model.modelVersion}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Computed At</Text>
              <Text style={styles.rowValue}>{computedAtDisplay}</Text>
            </View>
            {model.pipelineVersion != null && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Pipeline Version</Text>
                <Text style={styles.rowValue}>{String(model.pipelineVersion)}</Text>
              </View>
            )}
            {model.missingInputs.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.rowLabel}>Missing Inputs</Text>
                {model.missingInputs.map((item, i) => (
                  <Text key={i} style={styles.listItem}>
                    {item}
                  </Text>
                ))}
              </View>
            )}
            {model.thresholds != null && (
              <View style={styles.block}>
                <Text style={styles.sectionTitle}>Thresholds used</Text>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{"Composite attention <"}</Text>
                  <Text style={styles.rowValue}>
                    {String(model.thresholds.compositeAttentionLt)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{"Domain attention <"}</Text>
                  <Text style={styles.rowValue}>
                    {String(model.thresholds.domainAttentionLt)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{"Deviation attention % <"}</Text>
                  <Text style={styles.rowValue}>
                    {String(model.thresholds.deviationAttentionPctLt)}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Source</Text>
              <Text style={styles.rowValue}>{model.derivedFromLabel}</Text>
            </View>
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={onClose}>
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
  scrollContent: { gap: 12, paddingBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 13, color: "#8E8E93" },
  rowValue: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", flexShrink: 1 },
  block: { gap: 4 },
  sectionTitle: { fontSize: 13, color: "#8E8E93", marginTop: 8 },
  listItem: { fontSize: 15, color: "#1C1C1E", marginLeft: 0 },
  closeButton: {
    marginTop: 16,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
});
