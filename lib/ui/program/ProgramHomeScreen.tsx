// lib/ui/program/ProgramHomeScreen.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { ProgramBuilderType, ProgramHomeModel } from "@/lib/data/program/types";
import { ModuleEmptyState } from "@/lib/ui/ModuleEmptyState";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { ActiveProgramCard } from "@/lib/ui/program/ActiveProgramCard";
import { ProgramBuilderCard } from "@/lib/ui/program/ProgramBuilderCard";

export type ProgramHomeScreenProps = {
  model: ProgramHomeModel;
  /** v1: Create flow not yet wired. Reserved for when persistence/builders land. */
  onCreateProgram?: () => void;
  /** v1: builders are disabled "coming soon"; reserved for future deep-builder navigation. */
  onOpenBuilder?: (type: ProgramBuilderType) => void;
};

function SectionHeader({ title }: { title: string }): React.ReactElement {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </Text>
  );
}

export function ProgramHomeScreen({
  model,
  onCreateProgram,
  onOpenBuilder,
}: ProgramHomeScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Program"
    >
      <ActiveProgramCard
        program={model.activeProgram}
        {...(onCreateProgram ? { onCreate: onCreateProgram } : {})}
      />

      <View style={styles.section}>
        <SectionHeader title="Builders" />
        <View style={styles.buildersGrid}>
          {model.builders.map((builder) => (
            <ProgramBuilderCard
              key={builder.type}
              model={builder}
              {...(onOpenBuilder ? { onPress: onOpenBuilder } : {})}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Saved Programs" />
        {model.savedPrograms.length === 0 ? (
          <ModuleEmptyState
            title="No saved programs yet"
            description="Programs you build and save will appear here, ready to use, edit, or duplicate."
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Shared Programs" />
        {model.sharedPrograms.length === 0 ? (
          <ModuleEmptyState
            title="No shared programs yet"
            description="Programs shared with you, or that you share, will appear here."
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 4,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  buildersGrid: {
    gap: 12,
  },
});
