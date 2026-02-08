// app/(app)/(tabs)/timeline/_layout.tsx
import { Stack } from "expo-router";

export default function TimelineLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[day]" />
    </Stack>
  );
}
