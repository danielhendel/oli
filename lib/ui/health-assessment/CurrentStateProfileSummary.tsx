// lib/ui/health-assessment/CurrentStateProfileSummary.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CurrentStateProfile } from "@/lib/data/health-assessment/types";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type CurrentStateProfileSummaryProps = {
  profile: CurrentStateProfile;
};

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function CurrentStateProfileSummary({
  profile,
}: CurrentStateProfileSummaryProps): React.ReactElement {
  return (
    <View style={styles.wrap} testID="current-state-profile-summary">
      <ProgramSectionCard
        title="Current State Profile"
        subtitle="Your assessment summary — a foundation for your health plan. Not medical advice."
      >
        <ProfileRow
          label="Primary goal"
          value={profile.primaryGoal != null ? formatLabel(profile.primaryGoal) : "Not set"}
        />
        <ProfileRow label="Readiness to start" value={formatLabel(profile.readinessToStart)} />
        <ProfileRow
          label="Training experience"
          value={formatLabel(profile.trainingExperience)}
        />
        <ProfileRow label="Recovery capacity" value={formatLabel(profile.recoveryCapacity)} />
        <ProfileRow
          label="Nutrition consistency"
          value={formatLabel(profile.nutritionConsistency)}
        />
        <ProfileRow
          label="Completion"
          value={`${profile.completionPercent}%`}
          highlight
        />
      </ProgramSectionCard>

      <ProgramSectionCard title="Recommended starting focus">
        <Text style={styles.focusText}>{profile.recommendedStartingFocus}</Text>
      </ProgramSectionCard>

      {profile.primaryLimiters.length > 0 ? (
        <ProgramSectionCard title="Primary limiters">
          <View style={styles.chipRow}>
            {profile.primaryLimiters.map((limiter) => (
              <View key={limiter} style={styles.chip}>
                <Text style={styles.chipText}>{formatLabel(limiter)}</Text>
              </View>
            ))}
          </View>
        </ProgramSectionCard>
      ) : null}

      {profile.riskFlags.length > 0 ? (
        <ProgramSectionCard title="Caution flags">
          {profile.riskFlags.map((flag) => (
            <Text key={flag} style={styles.flagText}>
              • {flag}
            </Text>
          ))}
        </ProgramSectionCard>
      ) : null}

      <Text style={styles.disclaimer}>
        Oli does not diagnose or provide medical advice. Share concerns with a qualified clinician.
      </Text>
    </View>
  );
}

function ProfileRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    textAlign: "right",
  },
  rowValueHighlight: {
    color: SYSTEM_ACCENT,
  },
  focusText: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_PRIMARY,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(58, 91, 219, 0.14)",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
  flagText: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
    marginTop: 4,
  },
});
