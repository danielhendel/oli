import { View, StyleSheet } from "react-native";

export type ModuleTileSkeletonProps = {
  count?: number;
};

export function ModuleTileSkeleton({ count = 4 }: ModuleTileSkeletonProps) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.tile} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 120,
    borderRadius: 16,
    backgroundColor: "#EFEFF4",
  },
});
