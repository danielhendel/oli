// components/layout/HubScaffold.tsx
import React, { ReactNode } from "react";
import { ScrollView, View, StyleSheet, Pressable, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../lib/ui/Text";

type Props = {
  title: string;
  headerChildren?: ReactNode;   // e.g., <WeekHeader />
  onPressPlus?: () => void;     // navigates to /<cat>/setup
  children?: ReactNode;
};

export default function HubScaffold({ title, headerChildren, onPressPlus, children }: Props) {
  const scheme = useColorScheme();
  const bg = scheme === "dark" ? "#0B0F14" : "#FFFFFF";
  const divider = scheme === "dark" ? "rgba(255,255,255,0.08)" : "#E5E7EB";
  const plusBg = scheme === "dark" ? "rgba(255,255,255,0.08)" : "#F3F4F6";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0]}
        accessibilityLabel={`${title} hub`}
      >
        {/* Sticky header */}
        <View style={[styles.header, { backgroundColor: bg, borderBottomColor: divider }]}>
          <View style={styles.titleRow}>
            <View style={styles.sidePad} />
            <Text size="xl" weight="bold" align="center" numberOfLines={1}>
              {title}
            </Text>
            {onPressPlus ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${title} log`}
                hitSlop={8}
                onPress={onPressPlus}
                style={[styles.plusBtn, { backgroundColor: plusBg }]}
              >
                <Text size="xl" weight="bold" align="center">＋</Text>
              </Pressable>
            ) : (
              <View style={styles.sidePad} />
            )}
          </View>

          <View style={styles.headerBody}>{headerChildren}</View>
        </View>

        <View style={[styles.body, { backgroundColor: bg }]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 24 },
  header: {
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
    marginBottom: 6,
  },
  sidePad: { width: 36 },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBody: {},
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
});
