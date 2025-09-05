import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerLargeTitle: true,
          headerTitleStyle: { fontWeight: "600" }
        }}
      />
    </AuthProvider>
  );
}
