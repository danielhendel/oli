// app/(app)/settings/_layout.tsx
import { Stack, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "@/lib/ui/Text";

export default function SettingsLayout() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerBackVisible: false, // custom back
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.text,
        headerLeft: () => (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Returns to the previous screen"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              // optional: nudge left visually if you want tighter alignment
              // marginLeft: -4,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
        ),
        headerTitle: () => (
          <View pointerEvents="none">
            <Text weight="medium" style={{ color: theme.colors.text }}>
              Settings
            </Text>
          </View>
        ),
      }}
    >
      {/* This ensures the title also appears if you push child screens */}
      <Stack.Screen name="index" options={{ title: "Settings" }} />
    </Stack>
  );
}
