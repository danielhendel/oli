import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export type ModuleSettingsPlaceholderScreenProps = {
  title: string;
  description: string;
  overviewHref: string;
  overviewButtonLabel: string;
  overviewAccessibilityLabel: string;
  /** Secondary actions (e.g. Devices) rendered between description and primary CTA. */
  extraActions?: React.ReactNode;
};

/**
 * Shared placeholder for module-scoped settings (no backend; navigation-only).
 */
export function ModuleSettingsPlaceholderScreen({
  title,
  description,
  overviewHref,
  overviewButtonLabel,
  overviewAccessibilityLabel,
  extraActions,
}: ModuleSettingsPlaceholderScreenProps) {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.bodyText}>{description}</Text>
        {extraActions != null ? <View style={styles.extraWrap}>{extraActions}</View> : null}
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          onPress={() => router.replace(overviewHref as never)}
          accessibilityRole="button"
          accessibilityLabel={overviewAccessibilityLabel}
        >
          <Text style={styles.primaryBtnText}>{overviewButtonLabel}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#3C3C43",
  },
  extraWrap: {
    gap: 12,
  },
  primaryBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
