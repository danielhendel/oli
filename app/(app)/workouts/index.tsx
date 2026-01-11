import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";

export default function WorkoutsHomeScreen() {
  const router = useRouter();
  const sections = getModuleSections("workouts");

  return (
    <ModuleScreenShell title="Workouts" subtitle="Strength & cardio">
      <View style={styles.list}>
        {sections.map((s) => {
          const r = getSectionReadiness(s.id);

          return (
            <ModuleSectionLinkRow
              key={s.id}
              title={s.title}
              disabled={r.disabled}
              onPress={() => router.push(s.href)}
              {...(r.badge ? { badge: r.badge } : {})}
            />
          );
        })}
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
