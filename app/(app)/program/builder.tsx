import { Redirect } from "expo-router";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

/**
 * Placeholder builder hub is not launch-facing.
 * Cardio / Nutrition / Recovery builders remain as routes but are not advertised.
 * Workout builder remains at `/program/workout` for deep links only.
 */
export default function ProgramBuilderHubRoute() {
  return <Redirect href={OLI_TAB_ROUTES.program} />;
}
