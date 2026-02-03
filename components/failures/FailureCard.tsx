// components/failures/FailureCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { FailureListItemDto } from "@/lib/contracts/failure";

function formatLocalDateTime(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const d = new Date(ms);
  return d.toLocaleString();
}

function coerceString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function extractDomain(details: FailureListItemDto["details"]): string | null {
  if (!details || typeof details !== "object") return null;

  // Sprint 1: show affected domain only if explicitly present.
  const d = details as Record<string, unknown>;
  return (
    coerceString(d.affectedDomain) ??
    coerceString(d.domain) ??
    coerceString(d.stack) ??
    coerceString(d.module) ??
    coerceString(d.area)
  );
}

export type FailureCardProps = {
  item: FailureListItemDto;
};

export function FailureCard({ item }: FailureCardProps) {
  const domain = useMemo(() => extractDomain(item.details), [item.details]);

  const sourceParts: string[] = [item.type];
  if (item.rawEventPath) sourceParts.push(item.rawEventPath);

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>Failed</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Timestamp</Text>
        <Text style={styles.value}>{formatLocalDateTime(item.createdAt)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Source</Text>
        <Text style={styles.value} numberOfLines={2}>
          {sourceParts.join(" • ")}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Reason</Text>
        <Text style={styles.value} numberOfLines={3}>
          {item.code}: {item.message}
        </Text>
      </View>

      {domain ? (
        <View style={styles.row}>
          <Text style={styles.label}>Affected domain</Text>
          <Text style={styles.value}>{domain}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FDECEC",
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#B00020",
    letterSpacing: 0.2,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.8,
  },
  value: {
    fontSize: 13,
    color: "#1C1C1E",
  },
});
