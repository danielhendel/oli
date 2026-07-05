import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useManageNavigation } from "@/components/navigation/ManageNavigationContext";
import { manageMenuAccessibilityHint } from "@/components/navigation/manageMenuAccessibility";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const BUTTON_SIZE = 44;
const ICON_SIZE = 24;

type Props = {
  testID?: string;
};

export function ManageMenuTriggerButton({
  testID = "dash-manage-menu-trigger",
}: Props): React.ReactElement {
  const triggerRef = useRef<View>(null);
  const { openManage } = useManageNavigation();

  const onPress = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      openManage({ x, y, width, height, presentation: "popover" });
    });
  }, [openManage]);

  return (
    <View ref={triggerRef} collapsable={false}>
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        accessibilityHint={manageMenuAccessibilityHint()}
      >
        <Ionicons name="menu" size={ICON_SIZE} color={UI_TEXT_PRIMARY} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
