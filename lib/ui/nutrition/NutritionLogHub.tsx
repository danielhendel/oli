import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

export type NutritionLogHubMode =
  | "search"
  | "kitchen"
  | "meals"
  | "supplements"
  | "manual"
  | "scan";

type HubEntry = {
  mode: NutritionLogHubMode;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
};

const ENTRIES: readonly HubEntry[] = [
  {
    mode: "search",
    title: "Search products",
    subtitle: "Stop & Shop, Costco, Whole Foods, and more",
    icon: "search-outline",
    accessibilityLabel: "Search products",
  },
  {
    mode: "kitchen",
    title: "My Kitchen",
    subtitle: "Foods you keep at home",
    icon: "home-outline",
    accessibilityLabel: "Add from My Kitchen",
  },
  {
    mode: "meals",
    title: "Recent meals",
    subtitle: "Your saved breakfast, lunch, and snacks",
    icon: "restaurant-outline",
    accessibilityLabel: "Add common meal",
  },
  {
    mode: "supplements",
    title: "Supplements",
    subtitle: "Protein, vitamins, and more",
    icon: "fitness-outline",
    accessibilityLabel: "Add supplement",
  },
  {
    mode: "manual",
    title: "Manual entry",
    subtitle: "Enter calories and macros directly",
    icon: "create-outline",
    accessibilityLabel: "Manual nutrition entry",
  },
  {
    mode: "scan",
    title: "Scan barcode",
    subtitle: "Point your camera at a product barcode",
    icon: "barcode-outline",
    accessibilityLabel: "Scan barcode",
  },
] as const;

type Props = {
  onSelectMode: (mode: NutritionLogHubMode) => void;
};

export function NutritionLogHub({ onSelectMode }: Props) {
  return (
    <View style={styles.wrap} testID="nutrition-log-hub">
      <Text style={styles.lede}>Choose how you want to log nutrition today.</Text>
      <View style={styles.list}>
        {ENTRIES.map((entry) => (
          <Pressable
            key={entry.mode}
            onPress={() => onSelectMode(entry.mode)}
            accessibilityRole="button"
            accessibilityLabel={entry.accessibilityLabel}
            testID={`nutrition-log-hub-${entry.mode}`}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={entry.icon} size={22} color={UI_TEXT_PRIMARY} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>{entry.title}</Text>
              <Text style={styles.rowSubtitle}>{entry.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={UI_TEXT_SECONDARY} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  lede: { fontSize: 15, lineHeight: 21, color: UI_TEXT_SECONDARY, paddingHorizontal: 2 },
  list: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    overflow: "hidden",
    ...elevatedCardSurfaceStyle,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 64,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(84, 84, 88, 0.36)",
  },
  rowPressed: { opacity: 0.7 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(10, 132, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  rowTitle: { ...strengthMetricCardTitleTextStyle, fontSize: 17 },
  rowSubtitle: { fontSize: 13, color: UI_TEXT_SECONDARY, lineHeight: 18 },
});
