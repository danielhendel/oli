/**
 * Daily Recap is not launch-facing (Stage 1B). Placeholder removed from navigation;
 * deep links redirect to the canonical Today home until Review/Adaptation exists.
 */
import { Redirect } from "expo-router";

import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";

export default function DailyRecapRedirect() {
  return <Redirect href={CONSUMER_HOME_HREF} />;
}
