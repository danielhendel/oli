// Shared title row for tab pages: title (and optional subtitle) left, optional rightSlot (e.g. Settings gear) right.
// Gear is in the same row as the title so it aligns with the title line; subtitle sits below.
import { View, Text, StyleSheet } from "react-native";
import { UI_TEXT_MUTED, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type PageTitleRowProps = {
  title: string;
  subtitle?: string;
  /** `soft` = light gray; `dash` = readable secondary on Dash grouped background. */
  subtitleVariant?: "default" | "soft" | "dash";
  rightSlot?: React.ReactNode;
};

function subtitleStyleForVariant(variant: "default" | "soft" | "dash") {
  if (variant === "soft") return styles.subtitleSoft;
  if (variant === "dash") return styles.subtitleDash;
  return styles.subtitle;
}

export function PageTitleRow({ title, subtitle, subtitleVariant = "default", rightSlot }: PageTitleRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {rightSlot != null ? (
          <View style={styles.rightSlot}>{rightSlot}</View>
        ) : null}
      </View>
      {subtitle != null && subtitle !== "" ? (
        <Text style={subtitleStyleForVariant(subtitleVariant)}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 22,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: 0.15,
  },
  rightSlot: { marginLeft: 8 },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 6 },
  subtitleSoft: {
    fontSize: 15,
    color: "#AEAEB2",
    marginTop: 6,
    lineHeight: 22,
  },
  subtitleDash: {
    fontSize: 16,
    color: UI_TEXT_MUTED,
    marginTop: 8,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
});
