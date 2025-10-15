import { Stack } from "expo-router";

export default function WorkoutsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#000" },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Workouts" }} />
      <Stack.Screen name="log" options={{ title: "Log Workout" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
    </Stack>
  );
}
