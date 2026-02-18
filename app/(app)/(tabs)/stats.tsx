// app/(app)/(tabs)/stats.tsx
import { View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { PageTitleRow } from "@/lib/ui/PageTitleRow";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";

export default function StatsScreen() {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <PageTitleRow
          title="Stats"
          subtitle="Interpretive surface — placeholder for Sprint 3."
          rightSlot={<SettingsGearButton />}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
