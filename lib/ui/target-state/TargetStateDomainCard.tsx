// lib/ui/target-state/TargetStateDomainCard.tsx
import React from "react";
import { StyleSheet, Text } from "react-native";

import type { TargetStateDomain } from "@/lib/data/target-state/types";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import { TargetStateMetricRow } from "@/lib/ui/target-state/TargetStateMetricRow";
import { UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type TargetStateDomainCardProps = {
  domain: TargetStateDomain;
};

export function TargetStateDomainCard({ domain }: TargetStateDomainCardProps): React.ReactElement {
  return (
    <ProgramSectionCard
      title={domain.title}
      subtitle={`Priority ${domain.priority} in your roadmap`}
      testID={`target-state-domain-${domain.domain}`}
    >
      {domain.metrics.map((metric) => (
        <TargetStateMetricRow key={metric.metricId} metric={metric} />
      ))}
      {domain.metrics.length === 0 ? (
        <Text style={styles.empty}>No classification targets for this domain yet.</Text>
      ) : null}
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, color: UI_TEXT_SECONDARY },
});
