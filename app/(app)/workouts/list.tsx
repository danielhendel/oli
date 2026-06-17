import { WorkoutModuleLogScreen } from "@/lib/ui/logs/WorkoutModuleLogScreen";

export default function StrengthLogScreen() {
  return (
    <WorkoutModuleLogScreen
      domain="strength"
      title="Strength Log"
      testId="strength-log-screen"
      emptyTitle="No workouts yet"
      emptyDescription="Start logging your strength sessions to see them here."
    />
  );
}
