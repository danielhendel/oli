// lib/ui/ProvenanceRow.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type ProvenanceRowProps = {
  /**
   * Minimal provenance surface for explainability.
   * Required by Phase 1 §4.2.
   */
  computedAtIso: string | null;
  pipelineVersion: number | null;
  latestCanonicalEventAtIso: string | null;
  eventsCount: number | null;
  hash?: string | null;

  /**
   * Optional label for the row (e.g. "Today", "Daily facts").
   * Keep short; this is meant to be “small print”.
   */
  label?: string;
};

function isoToReadable(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  return d.toLocaleString();
}

export function ProvenanceRow({
  computedAtIso,
  pipelineVersion,
  latestCanonicalEventAtIso,
  eventsCount,
  hash,
  label,
}: ProvenanceRowProps) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Text style={styles.title}>
        Provenance{label ? ` • ${label}` : ""}
      </Text>

      <View style={styles.grid}>
        <Text style={styles.item}>Events: {eventsCount === null ? "—" : String(eventsCount)}</Text>
        <Text style={styles.item}>Latest event: {isoToReadable(latestCanonicalEventAtIso)}</Text>
        <Text style={styles.item}>Computed: {isoToReadable(computedAtIso)}</Text>
        <Text style={styles.item}>PV: {pipelineVersion ?? "—"}</Text>
        {hash ? <Text style={styles.item}>Hash: {hash}</Text> : null}
      </View>

      <Text style={styles.hint}>
        This metadata explains what you’re seeing and whether derived truth is current.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#FAFAFC",
    borderWidth: 1,
    borderColor: "#ECECF2",
    gap: 8,
    marginTop: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.8,
  },
  grid: {
    gap: 4,
  },
  item: {
    fontSize: 12,
    opacity: 0.78,
  },
  hint: {
    fontSize: 11,
    opacity: 0.55,
    marginTop: 2,
  },
});