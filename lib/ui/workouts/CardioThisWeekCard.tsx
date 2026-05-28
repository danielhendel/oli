import React from "react";
import { type GestureResponderEvent } from "react-native";

import {
  StrengthThisWeekCombinedCard,
  type StrengthThisWeekSessionRowModel,
} from "@/lib/ui/workouts/StrengthThisWeekCombinedCard";

export type CardioThisWeekSessionRow = StrengthThisWeekSessionRowModel;

export type CardioThisWeekCardProps = {
  loading: boolean;
  emptyMessage: string;
  sessions: readonly CardioThisWeekSessionRow[];
  onPressSession: (dayKey: string, sessionId: string) => void;
  onPressSessionMenu: (
    dayKey: string,
    sessionId: string,
    event: GestureResponderEvent,
  ) => void;
  weekRangeLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  testID?: string;
};

/**
 * Cardio overview “This Week” — visual + navigator twin of {@link StrengthThisWeekCombinedCard}.
 * Reuses the same combined-card primitive so spacing, divider rhythm, week navigator chevrons,
 * accessibility behavior, and pressed states stay 100% in sync between Strength and Cardio.
 *
 * Row content is identical (title + meta + ••• menu); callers pass cardio modality as
 * `displayTitle` and headline (e.g. `"3.13 mi · 35 min"`) as `metadataLine`.
 */
export function CardioThisWeekCard({
  loading,
  emptyMessage,
  sessions,
  onPressSession,
  onPressSessionMenu,
  weekRangeLabel,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  testID = "cardio-overview-this-week-combined-card",
}: CardioThisWeekCardProps): React.ReactElement {
  return (
    <StrengthThisWeekCombinedCard
      loading={loading}
      emptyMessage={emptyMessage}
      sessions={sessions}
      onPressSession={onPressSession}
      onPressSessionMenu={onPressSessionMenu}
      {...(weekRangeLabel != null ? { weekRangeLabel } : {})}
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext}
      {...(onPressPrevious != null ? { onPressPrevious } : {})}
      {...(onPressNext != null ? { onPressNext } : {})}
      testID={testID}
    />
  );
}
