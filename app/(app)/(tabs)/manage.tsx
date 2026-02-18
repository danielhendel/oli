// app/(app)/(tabs)/manage.tsx
import { ScrollView, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { PageTitleRow } from "@/lib/ui/PageTitleRow";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";

export default function ManageScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageTitleRow
          title="Manage"
          subtitle="Entry point for logging and management. Destructive actions require auth friction (Sprint 4+)."
          rightSlot={<SettingsGearButton />}
        />
        <Text
          style={styles.link}
          onPress={() => router.push("/(app)/command-center")}
        >
          Open Command Center
        </Text>
        <Text
          style={styles.link}
          onPress={() => router.push("/(app)/log")}
        >
          Quick log (Phase 2)
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  link: { marginTop: 24, fontSize: 15, color: "#007AFF", fontWeight: "600" },
});
