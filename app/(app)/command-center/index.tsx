import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModuleTile } from "@/lib/ui/ModuleTile";
import { ModuleTileSkeleton } from "@/lib/ui/ModuleTileSkeleton";
import { CommandCenterHeader } from "@/lib/ui/CommandCenterHeader";
import { COMMAND_CENTER_MODULES } from "@/lib/modules/commandCenterModules";
import { getModuleReadiness } from "@/lib/modules/commandCenterReadiness";

function formatMetaLabel(d: Date) {
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const month = d.toLocaleDateString(undefined, { month: "short" });
  const day = d.getDate();
  return `Today • ${weekday}, ${month} ${day}`;
}

export default function CommandCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Step 5: UX states (wire real loading later)
  const isLoading = false;

  const modules = COMMAND_CENTER_MODULES;

  const isEmpty = !isLoading && modules.length === 0;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: Math.max(insets.bottom, 16) + 16 },
      ]}
    >
      <CommandCenterHeader
        title="Command Center"
        subtitle="Your health, unified"
        meta={formatMetaLabel(new Date())}
      />

      {isLoading ? (
        <ModuleTileSkeleton count={6} />
      ) : isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No modules yet</Text>
          <Text style={styles.emptySubtitle}>
            This will populate as we wire your core stacks (Body, Training, Nutrition, Recovery, Labs).
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {modules.map((m) => {
            const readiness = getModuleReadiness(m.id);
            const disabled = readiness.disabled === true;

            return (
              <ModuleTile
                key={m.id}
                id={m.id}
                title={m.title}
                disabled={disabled}
                onPress={() => {
                  if (!disabled) router.push(m.href);
                }}
                {...(m.subtitle ? { subtitle: m.subtitle } : {})}
                {...(readiness.badge ? { badge: readiness.badge } : {})}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  empty: {
    paddingTop: 8,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
});
