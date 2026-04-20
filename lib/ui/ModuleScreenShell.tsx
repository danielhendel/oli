import React from "react";
import { ScrollView, View, Text, StyleSheet, type RefreshControlProps } from "react-native";

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
  children: React.ReactNode;
};

export function ModuleScreenShell({
  title,
  subtitle,
  hideTitleChrome = false,
  compactHeader = false,
  headerContent,
  refreshControl,
  children,
}: ModuleScreenShellProps) {
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        alwaysBounceVertical={Boolean(refreshControl)}
        {...(refreshControl ? { refreshControl } : {})}
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: "#F2F2F7",
  },
  root: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 16,
  },
  header: {
    backgroundColor: "#FFFFFF",
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
