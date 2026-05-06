// lib/ui/profile/ProfileHealthDataSection.tsx
// Digital twin: grouped health record cards (data from useProfileHealthSummary only).

import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, SectionList } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_TEXT_PRIMARY, UI_TEXT_SLATE_COOL, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import type { ProfileHealthSummaryResult } from "@/lib/features/profile/useProfileHealthSummary";
import type { ProfileDigitalTwinCategoryVm } from "@/lib/features/profile/profileDigitalTwinVm";
import type { HealthRecordGroup } from "@/lib/features/profile/healthRecordCategories";

const GROUP_ORDER: HealthRecordGroup[] = ["Health Systems", "Clinical Records", "Record Integrity"];

const GROUP_LABEL: Record<HealthRecordGroup, string> = {
  "Health Systems": "HEALTH SYSTEMS",
  "Clinical Records": "CLINICAL RECORDS",
  "Record Integrity": "RECORD INTEGRITY",
};

type Section = {
  title: string;
  group: HealthRecordGroup;
  data: ProfileDigitalTwinCategoryVm[];
};

function statusPillColor(label: string): string {
  if (label === "Logged") return UI_TEXT_SLATE_COOL;
  if (label === "No data yet" || label === "Partial") return UI_TEXT_TERTIARY_LABEL;
  if (label === "Needs setup" || label === "Unavailable") return "#8E8E93";
  return UI_TEXT_TERTIARY_LABEL;
}

type CardProps = {
  vm: ProfileDigitalTwinCategoryVm;
  onPress: () => void;
};

function DigitalTwinCategoryCard({ vm, onPress }: CardProps) {
  const canNavigate = vm.navigationHref != null;
  const a11yParts = [
    vm.category.title,
    vm.dataStatusLabel,
    vm.subtitleLine,
    vm.coverageLabel,
    vm.baselineLabel,
    vm.emptyDetail,
  ].filter((p) => p != null && p !== "");
  const a11y = `${a11yParts.join(". ")}. ${canNavigate ? "Double tap to open" : "No destination"}`;

  return (
    <Pressable
      onPress={onPress}
      disabled={!canNavigate}
      style={({ pressed }) => [
        styles.card,
        canNavigate && pressed ? styles.cardPressed : null,
        !canNavigate ? styles.cardStatic : null,
      ]}
      accessibilityRole={canNavigate ? "button" : "text"}
      accessibilityLabel={a11y}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{vm.category.title}</Text>
        <Text style={[styles.statusPill, { color: statusPillColor(vm.dataStatusLabel) }]}>{vm.dataStatusLabel}</Text>
      </View>
      <Text style={styles.cardDescription}>{vm.category.description}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={2}>
        {vm.subtitleLine}
      </Text>
      {vm.coverageLabel != null ? <Text style={styles.metaLine}>Coverage: {vm.coverageLabel}</Text> : null}
      {vm.baselineLabel != null ? <Text style={styles.metaLine}>{vm.baselineLabel}</Text> : null}
      {vm.emptyDetail.length > 0 ? <Text style={styles.emptyDetail}>{vm.emptyDetail}</Text> : null}
    </Pressable>
  );
}

export type ProfileHealthDataSectionProps = {
  health: ProfileHealthSummaryResult;
};

export function ProfileHealthDataSection({ health }: ProfileHealthDataSectionProps) {
  const router = useRouter();
  const { signedOut, categories } = health;

  const sections: Section[] = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      title: GROUP_LABEL[group],
      group,
      data: categories.filter((c) => c.category.group === group),
    })).filter((s) => s.data.length > 0);
  }, [categories]);

  if (signedOut) {
    return (
      <View style={styles.signedOutBox} accessibilityRole="text" accessibilityLabel="Sign in to view your health data">
        <Text style={styles.signedOutText}>Sign in to see your full health record and digital twin.</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.category.id}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader} accessibilityRole="header">
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => (
        <DigitalTwinCategoryCard
          vm={item}
          onPress={() => {
            if (item.navigationHref != null) {
              router.push(item.navigationHref as Href);
            }
          }}
        />
      )}
      SectionSeparatorComponent={() => <View style={{ height: 10 }} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderSectionFooter={() => <View style={{ height: 8 }} />}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: 0.6,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 15,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardStatic: {
    opacity: 0.95,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  statusPill: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SLATE_COOL,
    fontWeight: "400",
  },
  cardSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_PRIMARY,
    marginTop: 4,
  },
  metaLine: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  emptyDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
    fontStyle: "italic",
    marginTop: 2,
  },
  signedOutBox: {
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  signedOutText: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SLATE_COOL,
  },
  // Style reference for parent — section list is non-scrolling; parent ScrollView provides scroll
});
