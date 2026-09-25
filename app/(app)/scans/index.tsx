/**
 * Scans now resolve to the Body Scans experience, which owns upload, review, export,
 * and deletion for this domain. Kept as a redirect so existing links keep working.
 */
import { Redirect } from "expo-router";

export default function ScansScreen() {
  return <Redirect href="/(app)/body/scans" />;
}
