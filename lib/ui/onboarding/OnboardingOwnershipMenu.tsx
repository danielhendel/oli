// lib/ui/onboarding/OnboardingOwnershipMenu.tsx
import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { ONBOARDING_OWNERSHIP_HREFS } from "@/lib/onboarding/constants";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

/**
 * Restrained Account access during onboarding — Sign Out, Account, Privacy, Your Data, Delete.
 * No legal assent; ownership escape only.
 */
export function OnboardingOwnershipMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { signOut, user } = useAuth();

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href as never);
    },
    [router],
  );

  const onSignOut = useCallback(() => {
    setOpen(false);
    Alert.alert("Sign out?", "You’ll need to sign in again to continue setup.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }, [signOut]);

  if (!user) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account"
        onPress={() => setOpen(true)}
        style={styles.trigger}
        hitSlop={8}
      >
        <Text style={styles.triggerLabel}>Account</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.scrim} onPress={close} accessibilityLabel="Dismiss account menu">
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Account</Text>
            <MenuRow label="Account" onPress={() => go(ONBOARDING_OWNERSHIP_HREFS.account)} />
            <MenuRow label="Privacy" onPress={() => go(ONBOARDING_OWNERSHIP_HREFS.privacy)} />
            <MenuRow label="Your Data" onPress={() => go(ONBOARDING_OWNERSHIP_HREFS.yourData)} />
            <MenuRow
              label="Delete Account"
              destructive
              onPress={() => go(ONBOARDING_OWNERSHIP_HREFS.deleteAccount)}
            />
            <MenuRow label="Sign Out" destructive onPress={onSignOut} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuRow({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={[styles.rowLabel, destructive ? styles.rowDestructive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  triggerLabel: {
    color: UI_TEXT_SECONDARY,
    fontWeight: "600",
    fontSize: 15,
  },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 16,
  },
  sheet: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    minWidth: 220,
    paddingVertical: 8,
  },
  sheetTitle: {
    color: UI_TEXT_PRIMARY,
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.7,
  },
  row: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  rowLabel: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  rowDestructive: {
    color: "#FF6B6B",
  },
});
