// app/(app)/workout/day/[ymd].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthContext";
import { useDayEvents } from "@/lib/logging/useDayEvents";
import DayDetails from "@/components/logging/DayDetails";
import { DayToolbar } from "@/components/logging/DayToolbar";
import { addDaysYMD } from "@/lib/logging/selectors";
import Button from "@/lib/ui/Button";
import { on } from "@/lib/ui/eventBus";

/** Pretty date like "Tue, Sep 9" from a YYYY-MM-DD string. */
function prettyTitle(ymd: string): string {
  const dt = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function WorkoutDayScreen() {
  const { ymd } = useLocalSearchParams<{ ymd: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // Local ymd mirrors the URL param
  const [day, setDay] = useState<string>(String(ymd));
  useEffect(() => {
    const urlDay = String(ymd);
    if (urlDay && urlDay !== day) setDay(urlDay);
  }, [ymd, day]);

  const title = useMemo(() => prettyTitle(day), [day]);

  const go = (dir: "prev" | "next") => {
    const nextDay = addDaysYMD(day, dir === "next" ? 1 : -1);
    setDay(nextDay);
    router.setParams({ ymd: nextDay });
  };

  const { items, loading, error, reload } = useDayEvents("workout", user?.uid, day);

  // ⬇ Sub to optimistic event so list updates instantly
  useEffect(() => {
    return on("log:saved", (payload) => {
      // Payload shape: { type?: string; ymd?: string }
      const p = (payload ?? {}) as { type?: string; ymd?: string };
      if (!p || (p.ymd && p.ymd !== day)) return;
      void reload();
    });
  }, [day, reload]);

  function handleClose() {
    // Always return to the hub for a crisp, predictable UX.
    router.replace("/(app)/(tabs)/workout");
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: title }} />
      <DayDetails
        header={<DayToolbar ymd={day} onPrev={() => go("prev")} onNext={() => go("next")} />}
        loading={loading}
        error={error}
        items={items}
        onRefresh={reload}
        bottomInset={92}
      />
      <View style={styles.stickyBar} pointerEvents="box-none">
        <View style={styles.stickyInner}>
          <Button label="Close" onPress={handleClose} variant="ghost" style={styles.closeBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  stickyInner: { width: "100%", maxWidth: 520, alignSelf: "center" },
  closeBtn: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 14,
  },
});


