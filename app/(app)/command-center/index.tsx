/**
 * Command Center is no longer a consumer home (Stage 1B).
 * Deep links and stale bookmarks redirect to the canonical Today home.
 * The previous module-grid implementation remains in git history.
 */
import { Redirect } from "expo-router";

import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";

export default function CommandCenterRedirect() {
  return <Redirect href={CONSUMER_HOME_HREF} />;
}
