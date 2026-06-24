// lib/ui/health-baseline/BaselineCategoryCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BaselineCategoryStatus, BaselineMetric } from "@/lib/data/health-baseline/types";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

export type BaselineCategoryCardProps = {
  title: string;
  subtitle?: string;
  status: BaselineCategoryStatus;
  metrics: readonly BaselineMetric[];
  testID?: string;
};

function statusPill(status: BaselineCategoryStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "partial":
      return "Partial";
    case "missing":
      return "No data";
    default: {
      const _exhaustive: never = status;
      return String(_exhaustive);
    }
  }
}

export function BaselineCategoryCard({
  title,
  subtitle,
  status,
  metrics,
  testID,
}: BaselineCategoryCardProps): React.ReactElement {
  const availableMetrics = metrics.filter((m) => m.available);
  const empty = availableMetrics.length === 0;

  return (
    <ProgramSectionCard
      title={title}
      {...(subtitle != null ? { subtitle } : {})}
      rightPill={statusPill(status)}
      {...(testID != null ? { testID } : {})}
    >
      {empty ? (
        <Text style={styles.empty}>No measured data available yet for this category.</Text>
      ) : (
        availableMetrics.map((metric) => (
          <View key={metric.key} style={styles.row}>
            <Text style={styles.label}>{metric.label}</Text>
            <Text style={styles.value}>{metric.value ?? "—"}</Text>
          </View>
        ))
      )}
      {!empty && metrics.some((m) => !m.available) ? (
        <Text style={styles.missingNote}>
          {metrics
            .filter((m) => !m.available)
            .map((m) => m.label)
            .join(", ")}{" "}
          not available
        </Text>
      ) : null}
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  label: { flex: 1, fontSize: 14, color: UI_TEXT_SECONDARY },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    textAlign: "right",
  },
  empty: { fontSize: 14, lineHeight: 20, color: UI_TEXT_TERTIARY_LABEL },
  missingNote: { fontSize: 12, lineHeight: 18, color: UI_TEXT_TERTIARY_LABEL, marginTop: 8 },
});
