// app/(app)/workouts/index.tsx
// W2.1: Remove intermediate menu screen.
// Expo Router: workouts/index.tsx maps to /workouts.
// Alias /workouts -> /workouts/overview.
// Deterministic: no logic changes, no new network, no routing side effects.
export { default } from "./overview";
