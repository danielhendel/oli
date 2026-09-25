import { Redirect } from "expo-router";

/**
 * DEXA reports live in Body Scans, alongside every other scan type.
 * Kept as a redirect so existing links and deep links keep working.
 */
export default function BodyDexaScreen() {
  return <Redirect href="/(app)/body/scans" />;
}
