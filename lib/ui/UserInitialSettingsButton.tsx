import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { deriveUserDisplayInitial } from "@/lib/data/profile/deriveUserDisplayInitial";
import { resolveUserProfileMainForUi } from "@/lib/data/profile/resolveUserProfileMainForUi";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import {
  UI_BORDER_SUBTLE,
  UI_SURFACE_PRESSED,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const BUTTON_SIZE = 44;

export function UserInitialSettingsButton(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { state: profileState } = useUserProfileMain();

  const profile = useMemo(() => resolveUserProfileMainForUi(profileState), [profileState]);

  const initial = useMemo(
    () =>
      deriveUserDisplayInitial({
        firstName: profile?.identity.firstName ?? null,
        displayName: user?.displayName ?? null,
        email: user?.email ?? null,
      }),
    [profile?.identity.firstName, user?.displayName, user?.email],
  );

  const firstName = profile?.identity.firstName?.trim() || null;
  const accessibilityLabel = firstName ? `Open ${firstName}'s settings` : "Open settings";

  return (
    <Pressable
      testID="user-initial-settings-button"
      onPress={() => router.push("/(app)/settings")}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens account and app settings"
    >
      <Text style={styles.initial} maxFontSizeMultiplier={1.2}>
        {initial}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI_SURFACE_PRESSED,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  initial: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
});
