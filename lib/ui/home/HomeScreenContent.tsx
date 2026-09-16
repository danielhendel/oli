// lib/ui/home/HomeScreenContent.tsx
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CONSUMER_HOME_SCREEN_TITLE } from "@/lib/navigation/consumerHome";
import { AppHeader } from "@/lib/ui/navigation/AppHeader";
import { AppNavigationDrawer } from "@/lib/ui/navigation/AppNavigationDrawer";
import { MyHealthPerformanceSection } from "@/lib/ui/home/MyHealthPerformanceSection";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

/**
 * Home = whole-person health & performance map.
 * Does not mount Daily Monitor / Today hooks.
 */
export function HomeScreenContent(): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <View style={styles.root} testID="home-screen-content">
      <AppHeader
        title={CONSUMER_HOME_SCREEN_TITLE}
        accessibilityLabel={CONSUMER_HOME_SCREEN_TITLE}
        onMenuPress={openDrawer}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="home-scroll"
      >
        <MyHealthPerformanceSection />
      </ScrollView>
      <AppNavigationDrawer visible={drawerOpen} onClose={closeDrawer} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scrollView: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scroll: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 4,
    flexGrow: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
});
