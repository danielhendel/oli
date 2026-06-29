"use client";

import { Suspense } from "react";

import NewWorkoutStudioPageContent from "./NewWorkoutStudioPageContent";

export default function NewWorkoutStudioPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#8f99ab" }}>Loading Workout Studio…</div>}>
      <NewWorkoutStudioPageContent />
    </Suspense>
  );
}
