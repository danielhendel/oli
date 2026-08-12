// app/(app)/program/builder.tsx
// Stage 1B: placeholder builder grid is not launch-facing.
// Deep links to the hub redirect to the real workout builder.
import { Redirect } from "expo-router";

export default function ProgramBuilderHubRoute() {
  return <Redirect href={"/(app)/program/workout" as never} />;
}
