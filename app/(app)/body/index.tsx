import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";

export default function BodyIndexScreen() {
  const router = useRouter();
  const sections = getModuleSections("body");

  return (
    <ModuleScreenShell title="Body" subtitle="Composition & measurements">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.list}>
          {sections.map((s) => {
            const r = getSectionReadiness(s.id);

            return (
              <ModuleSectionLinkRow
                key={s.id}
                title={s.title}
                disabled={r.disabled}
                onPress={() => router.push(s.href)}
                {...(r.subtitle ? { subtitle: r.subtitle } : {})}
                {...(r.badge ? { badge: r.badge } : {})}
              />
            );
          })}
        </View>
      </ScrollView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  list: { gap: 12 },
});
