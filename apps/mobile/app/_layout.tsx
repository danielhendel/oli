import React from "react";
import { Stack } from "expo-router";
import { View, Text, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Keep this super simple until we see UI; no SplashScreen guards, no conditional hooks.
function Providers({ children }: { children: React.ReactNode }) {
  // If you have Theme/Auth/etc., add them back one by one AFTER you see UI.
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Providers>
        <Stack
          screenOptions={{
            headerShown: false,
            // helpful while debugging so we see something even if a child fails
            animation: Platform.OS === "ios" ? "default" : "fade",
          }}
        >
          {/* Expo Router will auto-register app/index.tsx */}
          <Stack.Screen name="index" />
        </Stack>
      </Providers>

      {/* Fixed debug footer so we always see SOMETHING if screens are empty */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingVertical: 6,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 12, opacity: 0.4 }}>router loaded ✅</Text>
      </View>
    </GestureHandlerRootView>
  );
}
