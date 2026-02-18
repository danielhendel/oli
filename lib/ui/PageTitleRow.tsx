// Shared title row for tab pages: title (and optional subtitle) left, optional rightSlot (e.g. Settings gear) right.
// Gear is in the same row as the title so it aligns with the title line; subtitle sits below.
import { View, Text, StyleSheet } from "react-native";

export type PageTitleRowProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export function PageTitleRow({ title, subtitle, rightSlot }: PageTitleRowProps) {
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
        <Text style={styles.subtitle}>{subtitle}</Text>
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
    fontSize: 28,
    fontWeight: "900",
    color: "#1C1C1E",
  },
  rightSlot: { marginLeft: 8 },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 6 },
});
