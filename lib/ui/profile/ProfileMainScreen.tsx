// lib/ui/profile/ProfileMainScreen.tsx
// Profile tab: identity rows + digital twin health record (dark grouped cards; matches Dash).
import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import {
  UI_APP_SCREEN_BG,
  UI_BORDER_HAIRLINE,
  UI_TAB_ROOT_CONTENT_GUTTER_STYLE,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SLATE_COOL,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import type { MassUnit, UserProfileMain } from "@oli/contracts";
import {
  formatHeightForDisplay,
  formatLengthUnit,
  formatSexAtBirth,
  massUnitLabel,
} from "@/lib/profile/profileDisplay";
import { isSuppressedProfileMainErrorMessage } from "@/lib/data/profile/profileTabViewModel";
import { ProfileHealthDataSection } from "@/lib/ui/profile/ProfileHealthDataSection";
import type { ProfileHealthSummaryResult } from "@/lib/features/profile/useProfileHealthSummary";

const PROFILE_SUBTITLE = "Your digital twin — all collected health and fitness data in one place.";

export type ProfileMainScreenProps = {
  profile: UserProfileMain | null;
  status: "partial" | "ready" | "error" | "missing";
  /** First fetch in flight (server profile not yet received); list still renders from defaults. */
  hydrating?: boolean;
  /** PATCH in flight (server had a profile baseline). */
  isSaving?: boolean;
  errorMessage?: string | undefined;
  massUnit: MassUnit;
  health: ProfileHealthSummaryResult;
};

export function ProfileMainScreen({
  profile,
  status,
  hydrating = false,
  isSaving = false,
  errorMessage,
  massUnit,
  health,
}: ProfileMainScreenProps) {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const pu = profile?.app.preferredUnits.length ?? "cm";
  const showLoadError =
    status === "error" &&
    typeof errorMessage === "string" &&
    errorMessage.length > 0 &&
    !isSuppressedProfileMainErrorMessage(errorMessage);

  const row = (label: string, value: string, href: string, a11y: string) => (
    <Pressable
      style={({ pressed }) => [styles.profileRow, pressed && styles.profileRowPressed]}
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <View style={styles.profileRowLeft}>
        <Text style={styles.profileRowLabel}>{label}</Text>
        <Text style={styles.profileRowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Text style={styles.profileRowChevron}>›</Text>
    </Pressable>
  );

  return (
    <ScreenContainer padded={false}>
      <View style={styles.tabRoot}>
        <TabRootScreenHeader
          title="Profile"
          subtitle={PROFILE_SUBTITLE}
          subtitleVariant="dash"
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          bounces
        >
          <View style={[styles.scrollInner, UI_TAB_ROOT_CONTENT_GUTTER_STYLE]}>
            {health.coverageSummaryLine != null ? (
              <Text
                style={styles.coverageSummary}
                accessibilityRole="text"
                accessibilityLabel={health.coverageSummaryLine}
              >
                {health.coverageSummaryLine}
              </Text>
            ) : null}

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

            <Text style={styles.sectionHeading} accessibilityRole="header">
              Identity
            </Text>
            <View style={styles.profileCard}>
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

            <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]} accessibilityRole="header">
              Health data
            </Text>
            <Text style={styles.sectionSubcopy}>
              A live map of what Oli has recorded — grouped like your health systems and clinical record.
            </Text>

            <ProfileHealthDataSection health={health} />

            <Text style={styles.disclaimer}>
              Optional profile fields help tailor your experience. Oli does not ask for Social Security numbers,
              government IDs, or payment details in Profile.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabRoot: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  scroll: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 6,
  },
  scrollInner: {
    flexGrow: 1,
  },
  coverageSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SLATE_COOL,
    marginBottom: 8,
  },
  sectionHeading: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 22,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  sectionHeadingSpaced: {
    marginTop: 28,
  },
  sectionSubcopy: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_TERTIARY_LABEL,
    marginBottom: 14,
  },
  profileCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    overflow: "hidden",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 15,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
  },
  profileRowPressed: {
    opacity: 0.9,
  },
  profileRowLeft: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  profileRowLabel: {
    fontSize: 15,
    color: UI_TEXT_TERTIARY_LABEL,
    fontWeight: "500",
  },
  profileRowValue: {
    fontSize: 17,
    color: UI_TEXT_PRIMARY,
    fontWeight: "500",
  },
  profileRowChevron: {
    fontSize: 20,
    color: UI_TEXT_TERTIARY_LABEL,
    marginLeft: 8,
  },
  errorText: {
    color: "#FF453A",
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
    color: UI_TEXT_TERTIARY_LABEL,
  },
  disclaimer: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
});
