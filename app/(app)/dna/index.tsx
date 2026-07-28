import { View, StyleSheet } from "react-native";
import { ScreenContainer, EmptyState } from "@/lib/ui/ScreenStates";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";

export default function DnaPlaceholderScreen() {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  return (
    <ScreenContainer padded={false}>
      <View style={[styles.pad, { paddingBottom: scrollPaddingBottom }]} testID="dna-placeholder">
        <EmptyState
          title="Not set up yet"
          description="This record system is not implemented yet. Genetic data cannot be stored here until persistence ships."
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
  },
});
