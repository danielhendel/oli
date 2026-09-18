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

export type BodyCompositionMeasurementTrustCardProps = {
  title: string;
  points: readonly string[];
  learnMoreLabel?: string;
  onPressLearnMore?: () => void;
};

export function BodyCompositionMeasurementTrustCard(props: BodyCompositionMeasurementTrustCardProps) {
  return (
    <View style={styles.card} testID="body-composition-measurement-trust">
      <Text style={styles.title} accessibilityRole="header">
        {props.title}
      </Text>
      {props.points.map((point) => (
        <Text key={point} style={styles.point}>
          · {point}
        </Text>
      ))}
      {props.onPressLearnMore ? (
        <Pressable
          style={styles.linkBtn}
          onPress={props.onPressLearnMore}
          accessibilityRole="button"
          accessibilityLabel={props.learnMoreLabel ?? "Learn more about measurement ranges"}
          accessibilityHint="Opens the Body measurement ranges explainer"
          testID="body-composition-measurement-trust-learn-more"
        >
          <Text style={styles.linkText}>{props.learnMoreLabel ?? "Learn more"}</Text>
        </Pressable>
      ) : null}
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
    gap: 8,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  point: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  linkBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    marginTop: 4,
  },
  linkText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
  },
});
