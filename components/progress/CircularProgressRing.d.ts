import React from "react";
type Props = {
    /** Percent value in [0,100]; null renders an empty ring. */
    percent: number | null;
    size?: number;
    strokeWidth?: number;
    trackColor: string;
    progressColor: string;
    label: string;
    accessibilityLabel: string;
    testID?: string;
};
export declare function CircularProgressRing({ percent, size, strokeWidth, trackColor, progressColor, label, accessibilityLabel, testID, }: Props): React.ReactElement;
export {};
//# sourceMappingURL=CircularProgressRing.d.ts.map