// app/_layout.tsx

// Keep Firebase init first:
import "@/lib/firebase/init";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeProvider"; // ✅ add this
import { initSentryIfEnabled } from "@/lib/telemetry/initSentry";
import { initEmulatorsIfNeeded } from "@/lib/firebase/emulators";

export default function RootLayout() {
  useEffect(() => {
    initSentryIfEnabled();
    void initEmulatorsIfNeeded();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>          {/* ✅ wrap the whole app with theme */}
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
