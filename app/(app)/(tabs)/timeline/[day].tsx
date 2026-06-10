// app/(app)/(tabs)/timeline/[day].tsx
// Deep-link / drill-down into a specific day's timeline log. Renders the same
// single-day experience as the tab root, anchored on the route's `day` param.
import { useLocalSearchParams } from "expo-router";
import { TimelineDayScreen } from "@/lib/ui/timeline/TimelineDayScreen";

export default function TimelineDayScreenRoute() {
  const params = useLocalSearchParams<{ day?: string }>();
  const day = typeof params.day === "string" ? params.day : undefined;
  return <TimelineDayScreen {...(day ? { initialDay: day } : {})} />;
}
