import { Redirect } from "expo-router";

/**
 * Health-owned supplements placeholder is not launch-facing.
 * Canonical destination: Nutrition Supplements.
 */
export default function SupplementsPlaceholderScreen() {
  return <Redirect href="/(app)/nutrition/supplements" />;
}
