import { WorkoutModuleLogScreen } from "@/lib/ui/logs/WorkoutModuleLogScreen";

export default function CardioLogScreen() {
  return (
    <WorkoutModuleLogScreen
      domain="cardio"
      title="Cardio Log"
      testId="cardio-log-screen"
      emptyTitle="No cardio sessions yet"
      emptyDescription="Synced and logged cardio workouts will appear here."
    />
  );
}
