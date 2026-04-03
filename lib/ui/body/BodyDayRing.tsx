import React from "react";
import { StyleSheet, View } from "react-native";

export const BODY_INDIGO = "#4F46E5";
const BODY_INDIGO_FILL = "rgba(79, 70, 229, 0.14)";

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
            borderWidth: emphasized ? 2.5 : 2,
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
    backgroundColor: BODY_INDIGO_FILL,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderColor: BODY_INDIGO,
  },
});

