// lib/ui/timeline/TimelineEventCard.tsx
// Single elevated timeline row card (icon + title + subtitle). Presentational only.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type TimelineEventCardModel = {
  title: string;
  subtitle?: string;
  icon: string;
  accessibilityLabel: string;
};

export type TimelineEventCardProps = {
  item: TimelineEventCardModel;
  /** Pre-formatted local time, e.g. "7:20 AM". Used for the accessibility label. */
  timeLabel: string;
  onPress: () => void;
  /** When false, omit chevron and disable press affordance. */
  actionable?: boolean;
};

export function TimelineEventCard({
  item,
  timeLabel,
  onPress,
  actionable = true,
}: TimelineEventCardProps) {
  const accessibilityLabel = [timeLabel, item.accessibilityLabel]
    .filter((s) => s && s.length > 0)
    .join(", ");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        actionable && pressed && styles.cardPressed,
        !actionable && styles.cardStatic,
      ]}
      onPress={actionable ? onPress : undefined}
      disabled={!actionable}
      accessibilityRole={actionable ? "button" : "text"}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon as never} size={18} color={SYSTEM_ACCENT} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      {actionable ? (
        <Ionicons name="chevron-forward" size={16} color={UI_TEXT_TERTIARY_LABEL} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    minHeight: 44,
    ...elevatedCardSurfaceStyle,
  },
  cardPressed: { opacity: 0.7 },
  cardStatic: {},
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: UI_TEXT_PRIMARY },
  subtitle: { fontSize: 13, color: UI_TEXT_SECONDARY, marginTop: 2 },
});
