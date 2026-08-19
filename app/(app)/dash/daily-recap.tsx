import { Redirect } from "expo-router";
import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";

/**
 * Daily Recap is a placeholder. Compatibility redirect to Home.
 * Do not present a “Coming soon” launch surface.
 */
export default function DailyRecapPlaceholderScreen() {
  return <Redirect href={CONSUMER_HOME_HREF} />;
}
