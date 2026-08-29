/**
 * Privacy & Consent information section (Stage 1B).
 * RG-LEGAL-01-aware: no fake legal acceptance controls.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  buildConsumerConsentArchitectureSnapshot,
  legalAssentStatusLabel,
} from "@/lib/consent/mapConsentReadiness";
import {
  UI_BORDER_SUBTLE,
  UI_PANEL_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export function PrivacyConsentSection() {
  const consent = buildConsumerConsentArchitectureSnapshot();

  return (
    <View style={styles.card} testID="privacy-consent-card" accessibilityRole="summary">
      <Text style={styles.cardTitle}>Privacy & consent</Text>
      <Text style={styles.cardBody}>
        Oli may ask for legal agreement and device permissions at different times. Connected sources
        like Apple Health are managed through iOS — they are separate from legal documents.
      </Text>

      <View style={styles.row} accessible accessibilityLabel={`Terms of Service, ${legalAssentStatusLabel(consent.legalTermsReadiness)}`}>
        <Text style={styles.rowLabel}>Terms of Service</Text>
        <Text style={styles.rowValue}>{legalAssentStatusLabel(consent.legalTermsReadiness)}</Text>
      </View>

      <View style={styles.row} accessible accessibilityLabel={`Privacy Policy, ${legalAssentStatusLabel(consent.legalPrivacyReadiness)}`}>
        <Text style={styles.rowLabel}>Privacy Policy</Text>
        <Text style={styles.rowValue}>{legalAssentStatusLabel(consent.legalPrivacyReadiness)}</Text>
      </View>

      <View style={styles.row} accessible accessibilityLabel="Apple Health, system permission">
        <Text style={styles.rowLabel}>Apple Health</Text>
        <Text style={styles.rowValue}>iOS permission</Text>
      </View>

      {consent.rgLegal01Open ? (
        <Text style={styles.footnote} testID="privacy-consent-rg-legal-footnote">
          Legal document acceptance is not active in this build. Hosted Privacy Policy and Terms are
          not yet published.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
    gap: 8,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: UI_TEXT_PRIMARY,
  },
  rowValue: {
    fontSize: 14,
    color: UI_TEXT_TERTIARY_LABEL,
    fontWeight: "500",
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
});
