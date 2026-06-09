// lib/ui/program/ProgramBuilderPlaceholderScreen.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { PlaceholderBuilderModel } from "@/lib/data/program/types";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import {
  UI_APP_SCREEN_BG,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ICON: Record<PlaceholderBuilderModel["type"], IconName> = {
  cardio: "pulse-outline",
  nutrition: "nutrition-outline",
  recovery: "moon-outline",
};

export type ProgramBuilderPlaceholderScreenProps = {
  model: PlaceholderBuilderModel;
};

/** Premium "coming soon" builder page for cardio / nutrition / recovery. No persistence. */
export function ProgramBuilderPlaceholderScreen({
  model,
}: ProgramBuilderPlaceholderScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={model.title}
    >
      <View style={styles.stack}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name={ICON[model.type]} size={26} color={SYSTEM_ACCENT} />
          </View>
          <Text style={styles.title}>{model.title}</Text>
          <Text style={styles.intro}>{model.intro}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{model.comingSoonLabel}</Text>
          </View>
        </View>

        <ProgramSectionCard
          title="What this builder will support"
          subtitle="A preview of the upcoming capabilities."
          testID="placeholder-capabilities-card"
        >
          <View style={styles.capabilities}>
            {model.capabilities.map((capability) => (
              <View key={capability} style={styles.capabilityRow} accessibilityLabel={capability}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={SYSTEM_ACCENT}
                  style={styles.capabilityIcon}
                />
                <Text style={styles.capabilityText}>{capability}</Text>
              </View>
            ))}
          </View>
        </ProgramSectionCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 16,
  },
  stack: {
    gap: 16,
  },
  hero: {
    gap: 10,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: UI_TEXT_PRIMARY,
    marginTop: 4,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: SYSTEM_ACCENT_FILL_14,
    marginTop: 2,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
  },
  capabilities: {
    gap: 12,
  },
  capabilityRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  capabilityIcon: {
    marginTop: 0,
  },
  capabilityText: {
    flex: 1,
    fontSize: 15,
    color: UI_TEXT_PRIMARY,
  },
});
