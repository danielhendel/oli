import { Text, View, StyleSheet } from "react-native";

export type CommandCenterHeaderProps = {
  title: string;
  subtitle?: string;
  meta?: string; // e.g. "Today • Fri, Dec 19"
};

export function CommandCenterHeader({ title, subtitle, meta }: CommandCenterHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  textBlock: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.72,
  },
  meta: {
    fontSize: 13,
    opacity: 0.55,
  },
});
