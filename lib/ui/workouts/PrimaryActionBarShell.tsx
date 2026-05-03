import React, { type ReactElement } from "react";
import { View, type ViewProps } from "react-native";

import { programPrimaryCtaBarStyles } from "@/lib/ui/workouts/programPrimaryCtaBarStyles";
import { logShellLayoutAudit } from "@/lib/ui/workouts/shellLayoutAudit";

export type PrimaryActionBarShellLayout = "center" | "row";

export type PrimaryActionBarShellProps = Omit<ViewProps, "style"> & {
  layout: PrimaryActionBarShellLayout;
  style?: ViewProps["style"];
};

/**
 * Shared blue surface for “Create Program” and This Week value rows — one View, same
 * {@link programPrimaryCtaBarStyles.primaryActionContainer} + layout stack as flattened styles.
 */
export function PrimaryActionBarShell({
  layout,
  style,
  children,
  onLayout,
  ...rest
}: PrimaryActionBarShellProps): ReactElement {
  return (
    <View
      style={[
        programPrimaryCtaBarStyles.primaryActionContainer,
        layout === "center"
          ? programPrimaryCtaBarStyles.ctaBarCenterLayout
          : programPrimaryCtaBarStyles.thisWeekRowLayout,
        style,
      ]}
      onLayout={(e) => {
        logShellLayoutAudit(`PrimaryActionBarShell:${layout}`, e);
        onLayout?.(e);
      }}
      {...rest}
    >
      {children}
    </View>
  );
}
