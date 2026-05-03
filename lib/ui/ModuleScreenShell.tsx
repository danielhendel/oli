import React from "react";
import { ScrollView, View, Text, StyleSheet, type RefreshControlProps } from "react-native";

import { UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";

export type ModuleScreenShellProps = {
  title: string;
  subtitle?: string;
  /** When true, do not render the in-page title/subtitle block (e.g. when title is in nav header). */
  hideTitleChrome?: boolean;
  /** Optional tighter header density for compact sticky strips (workouts calendar). */
  compactHeader?: boolean;
  /** Optional sticky header content rendered under the title/subtitle and pinned while body scrolls. */
  headerContent?: React.ReactNode;
  /** Passed to ScrollView (e.g. RefreshControl). */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /**
   * When false, body is a plain View (use when children include their own vertical VirtualizedList).
   * Avoids nesting FlatList inside ScrollView.
   */
  bodyScrollEnabled?: boolean;
  children: React.ReactNode;
};

export function ModuleScreenShell({
  title,
  subtitle,
  hideTitleChrome = false,
  compactHeader = false,
  headerContent,
  refreshControl,
  bodyScrollEnabled = true,
  children,
}: ModuleScreenShellProps) {
  const scrollBottomPad = useFloatingTabBarScrollPadding(28);
  const body = (
    <View style={[styles.content, !bodyScrollEnabled && styles.contentFlex]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      {(!hideTitleChrome || headerContent) && (
        <View style={[styles.header, compactHeader && styles.headerCompact]}>
          {!hideTitleChrome && (
            <>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </>
          )}
          {headerContent}
        </View>
      )}

      {bodyScrollEnabled ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.container, { paddingBottom: scrollBottomPad }]}
          alwaysBounceVertical={Boolean(refreshControl)}
          {...(refreshControl ? { refreshControl } : {})}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, styles.bodyNoScroll]}>
          {/* Pull-to-refresh with bodyScrollEnabled=false is unsupported — attach RefreshControl to the inner list instead. */}
          <View style={[styles.container, styles.containerFlexGrow, { paddingBottom: scrollBottomPad }]}>
            {body}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: UI_SCREEN_BG,
  },
  bodyNoScroll: {
    flex: 1,
    minHeight: 0,
  },
  containerFlexGrow: {
    flexGrow: 1,
    flex: 1,
    minHeight: 0,
  },
  contentFlex: {
    flex: 1,
    minHeight: 0,
  },
  root: {
    flex: 1,
    backgroundColor: UI_SCREEN_BG,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  header: {
    backgroundColor: UI_SCREEN_BG,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  headerCompact: {
    paddingTop: 4,
    paddingBottom: 1,
    gap: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  content: {
    gap: 12,
  },
});
