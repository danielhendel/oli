// app/(app)/(tabs)/timeline/_layout.tsx
import { Stack } from "expo-router";

export default function TimelineLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[day]" />
    </Stack>
  );
}
