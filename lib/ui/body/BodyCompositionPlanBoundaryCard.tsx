import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyCompositionPlanBoundaryCardProps = {
  title: string;
  body: string;
  actionLabel: string;
  onPressOpenPlan: () => void;
};

export function BodyCompositionPlanBoundaryCard(props: BodyCompositionPlanBoundaryCardProps) {
  return (
    <View style={styles.card} testID="body-composition-plan-boundary">
      <Text style={styles.title} accessibilityRole="header">
        {props.title}
      </Text>
      <Text style={styles.body}>{props.body}</Text>
      <Pressable
        style={styles.btn}
        onPress={props.onPressOpenPlan}
        accessibilityRole="button"
        accessibilityLabel={props.actionLabel}
        accessibilityHint="Opens Plan for individualized targets and actions"
        testID="body-composition-open-plan"
      >
        <Text style={styles.btnText}>{props.actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    padding: 14,
    gap: 10,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  btn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: BODY_INDIGO,
    borderRadius: 10,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
