import React from "react";
import { StyleSheet, View } from "react-native";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

/** @deprecated Use {@link SYSTEM_ACCENT} from `@/lib/ui/theme/systemAccent`. */
export const BODY_INDIGO = SYSTEM_ACCENT;

type BodyDayRingProps = {
  size: number;
  hasMeasurement: boolean;
  emphasized?: boolean;
  testID?: string;
};

export function BodyDayRing({ size, hasMeasurement, emphasized = false, testID }: BodyDayRingProps) {
  if (!hasMeasurement) return null;
  return (
    <View style={[styles.host, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        pointerEvents="none"
        style={[
          styles.fillDisk,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
      <View
        testID={testID}
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: emphasized ? 2.75 : 1.75,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  fillDisk: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderColor: SYSTEM_ACCENT,
  },
});

