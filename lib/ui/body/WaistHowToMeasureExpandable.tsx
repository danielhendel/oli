import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { WHO_MIDPOINT_HOW_TO_MEASURE } from "@/lib/body/waistProtocol";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type WaistHowToMeasureExpandableProps = {
  /** Starts expanded (entry sheet may prefer collapsed). */
  defaultExpanded?: boolean;
  testID?: string;
};

/**
 * Collapsible WHO midpoint measurement instructions — no classification copy.
 */
export function WaistHowToMeasureExpandable(props: WaistHowToMeasureExpandableProps) {
  const [expanded, setExpanded] = useState(props.defaultExpanded === true);
  const testID = props.testID ?? "waist-how-to-measure";

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? "How to Measure, expanded. Collapse."
            : "How to Measure, collapsed. Expand."
        }
        testID={`${testID}-toggle`}
      >
        <Text style={styles.title} accessibilityRole="header">
          How to Measure
        </Text>
        <Text style={styles.chevron} accessible={false}>
          {expanded ? "▾" : "▸"}
        </Text>
      </Pressable>
      {expanded ? (
        <Text style={styles.body} testID={`${testID}-body`}>
          {WHO_MIDPOINT_HOW_TO_MEASURE}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  chevron: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    color: UI_TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
});
