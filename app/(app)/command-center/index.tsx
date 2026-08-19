import { Redirect } from "expo-router";
import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";

/**
 * Command Center is retired as a competing consumer home.
 * Compatibility redirect — once, to Home. Do not render the module grid.
 */
export default function CommandCenterScreen() {
  return <Redirect href={CONSUMER_HOME_HREF} />;
}
