"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { StudioShell } from "@/components/StudioShell";
import { useWorkoutStudioDraft } from "@/features/workout-studio/useWorkoutStudioDraft";

export default function WorkoutStudioIndexPage() {
  const router = useRouter();
  const { state, createWorkout, loadWorkout } = useWorkoutStudioDraft();

  return (
    <StudioShell>
      <div className="page-header row-between" style={{ alignItems: "flex-end" }}>
        <div>
          <div className="page-eyebrow">Workout Studio</div>
          <h1 className="page-title">Workout experiences</h1>
          <p className="page-subtitle">
            Local prototype workouts only. Design rich, educational sessions — not spreadsheets.
          </p>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            const workout = createWorkout("Daniel Hendel");
            router.push(`/studio/workouts/new?workoutId=${workout.id}`);
          }}
        >
          New Workout Experience
        </button>
      </div>

      <div className="stack">
        {state.workouts.map((workout) => (
          <article key={workout.id} className="card row-between" style={{ alignItems: "flex-start" }}>
            <div>
              <h2 className="card-title">{workout.title}</h2>
              <p className="card-copy">{workout.overview.objective || "No objective yet."}</p>
              <div className="meta-row">
                <span className="pill">{workout.clientName}</span>
                <span className="pill">{workout.blocks.length} blocks</span>
                <span className="pill">{workout.difficulty}</span>
              </div>
            </div>
            <Link
              href={`/studio/workouts/new?workoutId=${workout.id}`}
              className="button"
              onClick={() => {
                loadWorkout(workout.id);
              }}
            >
              Open in Studio
            </Link>
          </article>
        ))}
      </div>
    </StudioShell>
  );
}
