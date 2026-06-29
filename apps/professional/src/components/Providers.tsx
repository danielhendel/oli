"use client";

import { SessionProvider } from "@/lib/mockSession";
import { WorkoutStudioProvider } from "@/features/workout-studio/useWorkoutStudioDraft";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WorkoutStudioProvider>{children}</WorkoutStudioProvider>
    </SessionProvider>
  );
}
