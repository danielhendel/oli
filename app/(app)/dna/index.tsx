import { View, StyleSheet } from "react-native";
import { ScreenContainer, EmptyState } from "@/lib/ui/ScreenStates";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";

export default function DnaPlaceholderScreen() {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  return (
    <ScreenContainer padded={false}>
      <View style={[styles.pad, { paddingBottom: scrollPaddingBottom }]}>
        <EmptyState
          title="DNA insights coming soon"
          description="Your genetic data and personalized insights will appear here."
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
