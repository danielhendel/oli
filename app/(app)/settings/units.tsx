// app/(app)/settings/units.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { usePreferences } from "../../../lib/preferences/PreferencesProvider";

type Choice = { key: "lb" | "kg"; label: string };

export default function UnitsSettingsScreen() {
  const { state, setMassUnit } = usePreferences();

  const choices: Choice[] = useMemo(
    () => [
      { key: "lb", label: "Pounds (lb)" },
      { key: "kg", label: "Kilograms (kg)" },
    ],
    [],
  );

  const selected = state.preferences.units.mass;

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Units</Text>
        <Text style={{ opacity: 0.7 }}>
          These settings only affect display. Stored health truth is never rewritten when you change units.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Weight</Text>

        {choices.map((c) => {
          const isSelected = c.key === selected;
          return (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              accessibilityLabel={`Set weight unit to ${c.label}`}
              onPress={() => setMassUnit(c.key)}
              style={{
                borderWidth: 1,
                borderColor: isSelected ? "black" : "rgba(0,0,0,0.2)",
                padding: 14,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: isSelected ? "700" : "500" }}>{c.label}</Text>
              {isSelected ? <Text style={{ fontWeight: "700" }}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {state.status === "partial" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator />
          <Text>Saving…</Text>
        </View>
      ) : null}

      {state.status === "error" ? (
        <Text style={{ color: "crimson" }}>Couldn’t save preferences: {state.message}</Text>
      ) : null}
    </View>
  );
}
