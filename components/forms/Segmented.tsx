// components/forms/Segmented.tsx
import { Pressable, View, StyleSheet } from "react-native";
import { Text } from "../../lib/ui/Text";

type Option = { key: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (key: string) => void;
};

export default function Segmented({ options, value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            onPress={() => onChange(opt.key)}
            style={[styles.item, active && styles.active]}
          >
            <Text weight={active ? "bold" : "regular"} align="center">
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  item: { flex: 1, paddingVertical: 10 },
  active: { backgroundColor: "#F3F4F6" },
});
