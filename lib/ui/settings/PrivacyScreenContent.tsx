/**
 * Privacy screen content — honest export/delete coverage (Phase 3B)
 * plus Privacy Policy / Terms / Support document access (Stage 1A).
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { UserDataInventoryViewModel } from "@/lib/data/user-data/buildUserDataInventoryViewModel";
import { isPublicLinkConfigured } from "@/lib/config/publicLinks";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { PrivacyConsentSection } from "@/lib/ui/settings/PrivacyConsentSection";
import { PublicDocumentLinks } from "@/lib/ui/legal/PublicDocumentLinks";
import {
  UI_BORDER_SUBTLE,
  UI_PANEL_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type PrivacyScreenContentProps = {
  inventory: UserDataInventoryViewModel | null;
};

export function PrivacyScreenContent({ inventory }: PrivacyScreenContentProps) {
  const router = useRouter();
  const privacy = inventory?.privacy;
  const hasPublicDocuments =
    isPublicLinkConfigured("privacyPolicy") ||
    isPublicLinkConfigured("termsOfService") ||
    isPublicLinkConfigured("support");

  return (
    <ModuleScreenShell title="Privacy" hideTitleChrome>
      <View style={styles.root} testID="privacy-screen">
        <Text style={styles.intro} testID="privacy-intro">
          Oli keeps health data scoped to your account. Export and deletion are available through
          the account API; coverage is not yet complete for every store.
        </Text>

        {hasPublicDocuments ? (
          <View style={styles.card} testID="privacy-documents-card">
            <Text style={styles.cardTitle}>Documents & support</Text>
            <PublicDocumentLinks
              kinds={["privacyPolicy", "termsOfService", "support"]}
              testID="privacy-public-links"
            />
          </View>
        ) : null}

        <PrivacyConsentSection />

        <View style={styles.card} testID="privacy-export-card">
          <Text style={styles.cardTitle}>Export</Text>
          <Text style={styles.cardBody}>
            {privacy?.exportCoverageComplete
              ? "Account export covers all required durable stores."
              : `Account export is available, but ${privacy?.exportGapCount ?? "some"} required data areas are not fully covered yet. Do not assume a complete archive.`}
          </Text>
        </View>

        <View style={styles.card} testID="privacy-delete-card">
          <Text style={styles.cardTitle}>Deletion coverage</Text>
          <Text style={styles.cardBody}>
            {privacy?.deleteCoverageComplete
              ? "Account deletion covers required durable stores. Use Account → Delete Account when you are ready."
              : `Deletion coverage is incomplete — ${privacy?.deleteGapCount ?? "some"} required data areas are not fully covered yet. Delete Account is available with honest coverage disclosure.`}
          </Text>
        </View>

        <View style={styles.card} testID="privacy-sources-card">
          <Text style={styles.cardTitle}>Connected sources</Text>
          <Text style={styles.cardBody}>
            Review device and source status in Your Data. A connected flag is not proof of active
            sync for every provider.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Your Data"
          testID="privacy-open-your-data"
          onPress={() => router.push("/(app)/settings/your-data")}
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
        >
          <Text style={styles.linkText}>Open Your Data</Text>
        </Pressable>

        <Text style={styles.footnote} testID="privacy-coverage-footnote">
          Control coverage is incomplete until the retention registry reports full export and
          deletion coverage.
        </Text>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  link: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkPressed: { opacity: 0.85 },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
});
