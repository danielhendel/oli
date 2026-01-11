import { Stack } from "expo-router";

export default function DeleteAccountLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Delete account",
        }}
      />
      <Stack.Screen
        name="confirm"
        options={{
          title: "Confirm deletion",
        }}
      />
      <Stack.Screen
        name="receipt"
        options={{
          title: "Request received",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
