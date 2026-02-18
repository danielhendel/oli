// app/(app)/settings/index.tsx
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";

type Section = ReturnType<typeof getModuleSections>[number];

const getStringEnv = (key: string): string | undefined => {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
};

export default function SettingsHomeScreen() {
  const router = useRouter();

  // preserve typing from module system
  const sections: Section[] = getModuleSections("settings");

  /**
   * Debug tools must never ship to production.
   * APP_ENV is preferred (explicit), NODE_ENV is fallback-safe.
   */
  const appEnv = getStringEnv("APP_ENV") ?? getStringEnv("NODE_ENV") ?? "development";
  const showDebug = appEnv !== "production";

  // Prevent duplicate "Account" row if it's already present in module sections.
  const normalizedTitle = (s: { title: string }) => s.title.trim().toLowerCase();
  const hasAccountInSections = sections.some((s) => normalizedTitle(s) === "account");

  const isDev =
    typeof globalThis !== "undefined" &&
    (globalThis as { __DEV__?: boolean }).__DEV__ === true;

  return (
    <ModuleScreenShell title="Settings" subtitle="Account & privacy">
      <View style={styles.list}>
        {sections.map((s) => {
          const readiness = getSectionReadiness(s.id);
          const isDevicesRow = s.id === "settings.devices";
          const disabled = isDevicesRow && isDev ? false : readiness.disabled;
          const badge = isDevicesRow && isDev ? undefined : readiness.badge;

          return (
            <ModuleSectionLinkRow
              key={s.id}
              title={s.title}
              disabled={disabled}
              onPress={() => router.push(s.href)}
              {...(badge ? { badge } : {})}
            />
          );
        })}

        <Text style={styles.sectionTitle}>Data integrity</Text>
        <ModuleSectionLinkRow
          title="Failures"
          disabled={false}
          onPress={() => router.push("/(app)/failures")}
        />

        {!hasAccountInSections ? (
          <ModuleSectionLinkRow
            title="Account"
            disabled={false}
            onPress={() => router.push("/(app)/settings/account")}
          />
        ) : null}

        {showDebug ? (
          <>
            <ModuleSectionLinkRow
              title="Debug Token"
              badge="Dev"
              disabled={false}
              onPress={() => router.push("/debug/token")}
            />
            <ModuleSectionLinkRow
              title="Debug API Smoke"
              badge="Dev"
              disabled={false}
              onPress={() => router.push("/debug/api-smoke")}
            />
            <ModuleSectionLinkRow
              title="Debug Backend Health"
              badge="Dev"
              disabled={false}
              onPress={() => router.push("/debug/health")}
            />
          </>
        ) : null}
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
    marginBottom: 4,
    textTransform: "uppercase",
  },
});
