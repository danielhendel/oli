// lib/ui/profile/ProfileMainScreen.tsx
// Tab-root layout: matches Dash / other tabs — ScreenContainer + in-scroll PageTitleRow (no settings gear).
import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { PageTitleRow } from "@/lib/ui/PageTitleRow";
import type { MassUnit, UserProfileMain } from "@oli/contracts";
import {
  formatHeightForDisplay,
  formatLengthUnit,
  formatPrimaryGoal,
  formatSexAtBirth,
  formatWeighIn,
  massUnitLabel,
} from "@/lib/profile/profileDisplay";
import { isSuppressedProfileMainErrorMessage } from "@/lib/data/profile/profileTabViewModel";

const CATEGORY_PLACEHOLDERS = [
  "Strength inputs",
  "Cardio inputs",
  "Nutrition inputs",
  "Sleep inputs",
  "Recovery inputs",
  "Health inputs",
] as const;

/** Tab-root grays: continuous page + grouped sections (aligned with app grays, not stark white cards). */
const PAGE_BG = "#F2F2F7";
const GROUP_BG = "#EBEBEF";
const GROUP_OUTLINE = "#D1D1D6";
const ROW_DIVIDER = "#C6C6CC";
const CHEVRON_MUTED = "#AEAEB2";

export type ProfileMainScreenProps = {
  profile: UserProfileMain | null;
  status: "partial" | "ready" | "error" | "missing";
  /** First fetch in flight (server profile not yet received); list still renders from defaults. */
  hydrating?: boolean;
  /** PATCH in flight (server had a profile baseline). */
  isSaving?: boolean;
  errorMessage?: string | undefined;
  massUnit: MassUnit;
};

export function ProfileMainScreen({
  profile,
  status,
  hydrating = false,
  isSaving = false,
  errorMessage,
  massUnit,
}: ProfileMainScreenProps) {
  const router = useRouter();
  const pu = profile?.app.preferredUnits.length ?? "cm";
  const showLoadError =
    status === "error" &&
    typeof errorMessage === "string" &&
    errorMessage.length > 0 &&
    !isSuppressedProfileMainErrorMessage(errorMessage);

  const row = (label: string, value: string, href: string, a11y: string) => (
    <Pressable
      style={styles.row}
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      android_ripple={{ color: "rgba(60, 60, 67, 0.12)" }}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );

  return (
    <ScreenContainer backgroundColor={PAGE_BG}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces
      >
        <PageTitleRow title="Profile" subtitle="Personalization & body context" />

        {showLoadError ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {hydrating ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Updating…</Text>
          </View>
        ) : null}
        {isSaving ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Saving…</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.listGroup}>
          {row(
            "First name",
            profile?.identity.firstName?.trim() ? profile.identity.firstName : "—",
            "/(app)/profile/edit/first_name",
            "Edit first name",
          )}
          {row(
            "Last name",
            profile?.identity.lastName?.trim() ? profile.identity.lastName : "—",
            "/(app)/profile/edit/last_name",
            "Edit last name",
          )}
          {row(
            "Date of birth",
            profile?.identity.dateOfBirth ?? "—",
            "/(app)/profile/edit/date_of_birth",
            "Edit date of birth",
          )}
          {row(
            "Sex at birth",
            formatSexAtBirth(profile?.identity.sexAtBirth ?? null),
            "/(app)/profile/edit/sex_at_birth",
            "Edit sex at birth",
          )}
          {row(
            "Height",
            formatHeightForDisplay(profile?.body.heightCm ?? null, pu),
            "/(app)/profile/edit/height",
            "Edit height",
          )}
          {row(
            "Preferred units",
            `${massUnitLabel(massUnit)} · ${formatLengthUnit(pu)}`,
            "/(app)/profile/edit/preferred_units",
            "Edit preferred units",
          )}
        </View>

        <Text style={styles.sectionLabel}>Body inputs</Text>
        <View style={styles.listGroup}>
          {row(
            "Athlete mode",
            profile?.bodyInputs.athleteMode ? "On" : "Off",
            "/(app)/profile/edit/athlete_mode",
            "Edit athlete mode",
          )}
          {row(
            "Primary goal",
            formatPrimaryGoal(profile?.bodyInputs.primaryGoal ?? null),
            "/(app)/profile/edit/primary_goal",
            "Edit primary goal",
          )}
          {row(
            "Usual weigh-in",
            formatWeighIn(profile?.bodyInputs.usualWeighInPreference ?? null),
            "/(app)/profile/edit/weigh_in_preference",
            "Edit usual weigh-in preference",
          )}
          {row(
            "Waist circumference",
            profile?.bodyInputs.waistCircumferenceCm != null
              ? `${profile.bodyInputs.waistCircumferenceCm} cm`
              : "—",
            "/(app)/profile/edit/waist",
            "Edit waist circumference",
          )}
          {row(
            "Hip circumference",
            profile?.bodyInputs.hipCircumferenceCm != null
              ? `${profile.bodyInputs.hipCircumferenceCm} cm`
              : "—",
            "/(app)/profile/edit/hip",
            "Edit hip circumference",
          )}
          {row(
            "Neck circumference",
            profile?.bodyInputs.neckCircumferenceCm != null
              ? `${profile.bodyInputs.neckCircumferenceCm} cm`
              : "—",
            "/(app)/profile/edit/neck",
            "Edit neck circumference",
          )}
        </View>

        <Text style={styles.sectionLabel}>Category inputs</Text>
        <View style={styles.listGroup}>
          {CATEGORY_PLACEHOLDERS.map((title) => (
            <View
              key={title}
              style={styles.row}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${title}, coming soon`}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowValue}>Coming soon</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.consent}>
          Profile and body inputs help tailor your experience. You can skip any optional field. Oli does not ask for
          Social Security numbers, government IDs, or payment details in Profile.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
  },
  listGroup: {
    borderRadius: 12,
    backgroundColor: GROUP_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GROUP_OUTLINE,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_DIVIDER,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 15,
    color: "#8E8E93",
  },
  rowChevron: {
    fontSize: 20,
    color: CHEVRON_MUTED,
    marginLeft: 8,
  },
  errorText: {
    color: "#C00",
    fontSize: 15,
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 15,
    color: "#6E6E73",
  },
  consent: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 18,
    color: "#6E6E73",
  },
});
