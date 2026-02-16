// app/(app)/(tabs)/dash/index.tsx
import { useEffect, useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import Card from "@/lib/ui/Card";
import { Input, SwitchRow } from "@/lib/ui/Fields";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  makeDefaultProfile,
  makeMockProfile,
  type Profile,
  type UnitSystem,
} from "@/lib/profile/profile";

const HEADER_HEIGHT = 56;

export default function DashboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => setProfile((await loadProfile()) ?? makeDefaultProfile()))();
  }, []);

  async function handleMockSave() {
    setBusy(true);
    try {
      const mock = makeMockProfile();
      await saveProfile(mock);
      setProfile(mock);
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await clearProfile();
      setProfile(makeDefaultProfile());
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdits(next: Partial<Profile>) {
    if (!profile) return;
    const merged: Profile = { ...profile, ...next };
    setBusy(true);
    try {
      await saveProfile(merged);
      setProfile(merged);
    } finally {
      setBusy(false);
    }
  }

  const unitsIsImperial = (profile?.unitSystem ?? "metric") === "imperial";
  const topPad = insets.top + HEADER_HEIGHT + 8;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Sticky header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top,
          backgroundColor: theme.colors.bg,
          zIndex: 10,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View
          style={{
            height: HEADER_HEIGHT,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
          }}
        >
          <Text size="2xl" weight="bold" accessibilityRole="header">
            Oli
          </Text>

          <Pressable
            onPress={() => {
              const href = "/settings" satisfies Href;
              router.push(href);
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={"settings-outline" as keyof typeof Ionicons.glyphMap}
              size={22}
              color={theme.colors.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: topPad, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text tone="muted" style={{ marginTop: 2 }}>
          Protected content visible because you’re signed in.
        </Text>

        {/* Profile summary */}
        <Card variant="elevated" padding="lg" radius="xl" style={{ marginTop: 24 }}>
          <Text weight="bold">Profile (local stub)</Text>

          <View style={{ height: 8 }} />
          <Text tone="muted">
            Name: <Text weight="medium">{profile?.displayName ?? "—"}</Text>
          </Text>
          <Text tone="muted">
            Units: <Text weight="medium">{profile?.unitSystem}</Text>
          </Text>
          <Text tone="muted">
            Birthday: <Text weight="medium">{profile?.birthdayIso ?? "—"}</Text>
          </Text>
          <Text tone="muted">
            Height: <Text weight="medium">{profile?.heightCm ?? "—"} cm</Text>
          </Text>
          <Text tone="muted">
            Weight: <Text weight="medium">{profile?.weightKg ?? "—"} kg</Text>
          </Text>

        <View style={{ height: 16 }} />
          <Button label="Mock Populate" onPress={handleMockSave} loading={busy} />
          <View style={{ height: 8 }} />
          <Button variant="ghost" label="Clear" onPress={handleClear} disabled={busy} />
        </Card>

        {/* Quick edit */}
        <Card variant="outline" padding="lg" radius="xl" style={{ marginTop: 16 }}>
          <Text weight="bold">Quick Edit</Text>
          <View style={{ height: 12 }} />

          <Input
            label="Display name"
            placeholder="Your name"
            value={profile?.displayName ?? ""}
            onChangeText={(t: string) => handleSaveEdits({ displayName: t })}
            returnKeyType="done"
            autoCapitalize="words"
          />

          <View style={{ height: 12 }} />
          <SwitchRow
            label="Use imperial units"
            description="Off = metric"
            value={unitsIsImperial}
            onValueChange={(v: boolean) => {
              const next: UnitSystem = v ? "imperial" : "metric";
              handleSaveEdits({ unitSystem: next });
            }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}
