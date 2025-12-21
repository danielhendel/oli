// app/(app)/command-center/index.tsx
import { ScrollView, View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ModuleTile } from "@/lib/ui/ModuleTile";
import { CommandCenterHeader } from "@/lib/ui/CommandCenterHeader";
import { COMMAND_CENTER_MODULES } from "@/lib/modules/commandCenterModules";
import { getModuleBadge, isModuleDisabled } from "@/lib/modules/commandCenterReadiness";

import { getTodayDayKey } from "@/lib/time/dayKey";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useInsights } from "@/lib/data/useInsights";
import { useIntelligenceContext } from "@/lib/data/useIntelligenceContext";

type StatusTone = "neutral" | "success" | "warning" | "danger";

const toneLabel: Record<StatusTone, string> = {
  neutral: "Status",
  success: "Ready",
  warning: "Needs input",
  danger: "Error",
};

const toneColor: Record<StatusTone, string> = {
  neutral: "#1C1C1E",
  success: "#1B5E20",
  warning: "#7A4E00",
  danger: "#B00020",
};

const toneBg: Record<StatusTone, string> = {
  neutral: "#F2F2F7",
  success: "#E9F7EC",
  warning: "#FFF5E6",
  danger: "#FDECEC",
};

function DataStatusCard(props: { day: string }) {
  const facts = useDailyFacts(props.day);
  const insights = useInsights(props.day);
  const ctx = useIntelligenceContext(props.day);

  const anyLoading =
    facts.status === "loading" || insights.status === "loading" || ctx.status === "loading";

  const anyError = facts.status === "error" || insights.status === "error" || ctx.status === "error";

  // IMPORTANT:
  // - DailyFacts + IntelligenceContext are "required docs" (can be not_found)
  // - Insights is not required and is treated as empty list (never "not_found" in our updated hook)
  const allNotFound = facts.status === "not_found" && ctx.status === "not_found";

  const anyReady =
    facts.status === "ready" || insights.status === "ready" || ctx.status === "ready";

  let tone: StatusTone = "neutral";
  let title = "Checking your data…";
  let subtitle = "Syncing today’s facts, insights, and context.";

  if (anyLoading) {
    tone = "neutral";
    title = "Checking your data…";
    subtitle = "Syncing today’s facts, insights, and context.";
  } else if (anyError) {
    tone = "danger";
    title = "Couldn’t load your data";
    const msg =
      (facts.status === "error" ? facts.message : null) ??
      (insights.status === "error" ? insights.message : null) ??
      (ctx.status === "error" ? ctx.message : null) ??
      "Please try again.";
    subtitle = msg;
  } else if (allNotFound) {
    tone = "warning";
    title = "No data yet for today";
    subtitle = "Log your first event (weight, workout, sleep, steps) to start building your Health OS.";
  } else if (anyReady) {
    tone = "success";
    title = "Today is live";
    const parts: string[] = [];
    parts.push(facts.status === "ready" ? "Facts ✓" : "Facts —");
    // Insights hook returns "ready" with {count:0,items:[]} even if none exist
    parts.push(insights.status === "ready" ? "Insights ✓" : "Insights —");
    parts.push(ctx.status === "ready" ? "Context ✓" : "Context —");
    subtitle = parts.join("  •  ");
  }

  return (
    <View style={[styles.statusCard, { backgroundColor: toneBg[tone] }]}>
      <View style={styles.statusTopRow}>
        <Text style={[styles.statusPill, { color: toneColor[tone] }]}>{toneLabel[tone]}</Text>
        <Text style={styles.statusDay}>{props.day}</Text>
      </View>

      <Text style={[styles.statusTitle, { color: toneColor[tone] }]}>{title}</Text>
      <Text style={styles.statusSubtitle}>{subtitle}</Text>
    </View>
  );
}

function QuickActionsRow() {
  const router = useRouter();

  return (
    <View style={styles.quickRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log Weight"
        onPress={() => router.push("/(app)/body/weight")}
        style={({ pressed }) => [styles.quickButton, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.quickButtonTitle}>Log Weight</Text>
        <Text style={styles.quickButtonSubtitle}>Fast daily weigh-in</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log Workout"
        onPress={() => router.push("/(app)/workouts")}
        style={({ pressed }) => [styles.quickButton, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.quickButtonTitle}>Log Workout</Text>
        <Text style={styles.quickButtonSubtitle}>Training session</Text>
      </Pressable>
    </View>
  );
}

export default function CommandCenterScreen() {
  const router = useRouter();
  const day = getTodayDayKey();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top row: header + gear */}
        <View style={styles.headerRow}>
          <View style={styles.headerCol}>
            <CommandCenterHeader title="Command Center" subtitle="Your health, unified" />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push("/(app)/settings")}
            style={({ pressed }) => [styles.gearButton, pressed && styles.gearPressed]}
          >
            <Text style={styles.gearText}>⚙️</Text>
          </Pressable>
        </View>

        {/* Data Status (truth-first) */}
        <DataStatusCard day={day} />

        {/* Quick actions (Golden Path) */}
        <QuickActionsRow />

        {/* Debug seed button (non-production only) */}
        {process.env.NODE_ENV !== "production" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Seed Weight (debug)"
            onPress={() => {
              // If you already had a seed function wired in a previous iteration,
              // paste it back here. Leaving as no-op prevents lint issues.
            }}
            style={({ pressed }) => [styles.seedButton, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.seedButtonText}>Seed Weight (debug)</Text>
          </Pressable>
        ) : null}

        {/* Grid */}
        <View style={styles.grid}>
          {COMMAND_CENTER_MODULES.map((m) => {
            const disabled = isModuleDisabled(m.id);
            const badge = getModuleBadge(m.id);

            return (
              <ModuleTile
                key={m.id}
                id={m.id}
                title={m.title}
                {...(m.subtitle ? { subtitle: m.subtitle } : {})}
                {...(badge ? { badge } : {})}
                disabled={disabled}
                onPress={() => {
                  if (!disabled) router.push(m.href);
                }}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    padding: 16,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCol: { flex: 1 },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  gearPressed: { opacity: 0.8 },
  gearText: { fontSize: 18 },

  statusCard: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  statusTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  statusDay: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusSubtitle: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },

  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  quickButtonTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  quickButtonSubtitle: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },

  seedButton: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
  },
  seedButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
