// app/(app)/(tabs)/you.tsx
// Oli — You: what Oli knows about the user. Real existing capabilities only.
import React from "react";
import { ScrollView, View, StyleSheet, Text } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { YOU_HUB_SECTIONS } from "@/lib/navigation/youHubItems";

export default function YouScreen() {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="You" subtitle="What does Oli know about me?" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
          testID="you-hub-scroll"
        >
          {YOU_HUB_SECTIONS.map((section) => (
            <View key={section.id} testID={`you-hub-section-${section.id}`}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item) => (
                <ModuleSectionLinkRow
                  key={item.id}
                  title={item.label}
                  accessibilityLabel={item.accessibilityLabel}
                  testID={item.testID}
                  onPress={() => router.push(item.href as Href)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 4,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
});
