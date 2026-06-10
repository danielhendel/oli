// app/(app)/(tabs)/timeline/index.tsx
// Timeline tab root: single-day chronological day log (Phase 1).
// No Firebase, no multi-day GET /users/me/timeline on load — see lib/features/timeline/useTimelineDay.
import { TimelineDayScreen } from "@/lib/ui/timeline/TimelineDayScreen";

export default function TimelineIndexScreen() {
  return <TimelineDayScreen />;
}
