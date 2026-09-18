import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  BodyCompositionBaselineAction,
  BodyCompositionStage3bReadiness,
} from "@/lib/body/education/bodyCompositionEducationTypes";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyCompositionBaselineSectionProps = {
  title: string;
  intro: string;
  readiness: BodyCompositionStage3bReadiness;
  readinessTitle: string;
  readinessBody: string;
  waistTitle: string;
  waistBody: string;
  dexaTitle: string;
  dexaBody: string;
  actions: readonly BodyCompositionBaselineAction[];
  /** Apple Health connect/review control rendered inside this section. */
  appleHealthSlot: React.ReactNode;
  onPressAddWeight: () => void;
  onPressHref: (href: string) => void;
};

export function BodyCompositionBaselineSection(props: BodyCompositionBaselineSectionProps) {
  return (
    <View style={styles.section} testID="body-composition-baseline-section">
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {props.title}
      </Text>
      <View
        style={styles.readinessCard}
        testID={`body-composition-readiness-${props.readiness}`}
        accessible
        accessibilityLabel={`${props.readinessTitle}. ${props.readinessBody}`}
      >
        <Text style={styles.readinessTitle}>{props.readinessTitle}</Text>
        <Text style={styles.readinessBody}>{props.readinessBody}</Text>
      </View>
      <Text style={styles.intro}>{props.intro}</Text>

      {props.actions.map((action) => {
        if (action.id === "apple_health") {
          return (
            <View key={action.id} style={styles.actionWrap} testID="body-composition-baseline-apple-health">
              <Text style={styles.actionSupporting}>{action.supportingCopy}</Text>
              {props.appleHealthSlot}
            </View>
          );
        }
        if (action.opensWeightLogModal) {
          return (
            <View key={action.id} style={styles.card}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSupporting}>{action.supportingCopy}</Text>
              <Pressable
                style={styles.primaryBtn}
                onPress={props.onPressAddWeight}
                accessibilityRole="button"
                accessibilityLabel="Add weight"
                accessibilityHint="Opens manual weight entry"
                testID="body-composition-add-weight"
              >
                <Text style={styles.primaryBtnText}>{action.label}</Text>
              </Pressable>
            </View>
          );
        }
        if (action.href == null) return null;
        return (
          <View key={action.id} style={styles.card}>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionSupporting}>{action.supportingCopy}</Text>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => props.onPressHref(action.href!)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityHint={`Opens ${action.label}`}
              testID={`body-composition-baseline-${action.id}`}
            >
              <Text style={styles.secondaryBtnText}>{action.label}</Text>
            </Pressable>
          </View>
        );
      })}

      <View style={styles.card} accessible accessibilityLabel={`${props.waistTitle}. ${props.waistBody}`}>
        <Text style={styles.actionLabel}>{props.waistTitle}</Text>
        <Text style={styles.actionSupporting}>{props.waistBody}</Text>
      </View>
      <View style={styles.card} accessible accessibilityLabel={`${props.dexaTitle}. ${props.dexaBody}`}>
        <Text style={styles.actionLabel}>{props.dexaTitle}</Text>
        <Text style={styles.actionSupporting}>{props.dexaBody}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  readinessCard: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    padding: 14,
    gap: 6,
  },
  readinessTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
  },
  readinessBody: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  intro: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  actionWrap: {
    gap: 10,
  },
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    padding: 14,
    gap: 8,
  },
  actionLabel: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
  actionSupporting: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: BODY_INDIGO,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_INDIGO,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: BODY_INDIGO,
  },
});
