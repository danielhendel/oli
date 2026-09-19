/**
 * Interactive Apple Health–style Oli sync-scope toggle.
 * Represents what Oli may sync/use — not native HealthKit permission truth.
 */

import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { UI_APPLE_HEALTH_TOGGLE_ON } from "@/lib/ui/theme/uiTokens";

export type AppleHealthScopeToggleProps = {
  metricLabel: string;
  on: boolean;
  disabled?: boolean;
  onValueChange: (next: boolean) => void;
  testID?: string;
};

export function AppleHealthScopeToggle(props: AppleHealthScopeToggleProps) {
  const on = props.on === true;
  const disabled = props.disabled === true;

  const handlePress = useCallback(() => {
    if (disabled) return;
    props.onValueChange(!on);
  }, [disabled, on, props]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={`Sync ${props.metricLabel} from Apple Health`}
      accessibilityHint="Controls whether Oli syncs this measurement from Apple Health. Apple Health permissions are managed separately."
      accessibilityValue={{ text: on ? "On" : "Off" }}
      testID={props.testID ?? "apple-health-scope-toggle"}
      style={[styles.hit, disabled ? styles.hitDisabled : null]}
    >
      <View style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.thumb, on ? styles.thumbOn : styles.thumbOff]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  hitDisabled: {
    opacity: 0.45,
  },
  track: {
    width: 51,
    height: 31,
    borderRadius: 16,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  trackOn: {
    backgroundColor: UI_APPLE_HEALTH_TOGGLE_ON,
    alignItems: "flex-end",
  },
  trackOff: {
    backgroundColor: "rgba(120,120,128,0.36)",
    alignItems: "flex-start",
  },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: "rgb(255, 255, 255)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  thumbOn: {},
  thumbOff: {},
});
