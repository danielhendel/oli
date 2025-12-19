// app/(app)/command-center/index.tsx
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { ModuleTile } from "@/lib/ui/ModuleTile";
import { COMMAND_CENTER_MODULES } from "@/lib/modules/commandCenterModules";
import { getModuleReadiness } from "@/lib/modules/commandCenterReadiness";

export default function CommandCenterScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Command Center</Text>
        <Text style={styles.subtitle}>Your health, unified</Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {COMMAND_CENTER_MODULES.map((m) => {
          const { disabled, badge } = getModuleReadiness(m.id);

          return (
            <ModuleTile
              key={m.id}
              id={m.id}
              title={m.title}
              disabled={disabled}
              onPress={() => router.push(m.href)}
              {...(m.subtitle ? { subtitle: m.subtitle } : {})}
              {...(badge ? { badge } : {})}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
