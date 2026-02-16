// apps/mobile/app/error.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ErrorScreen() {
  const router = useRouter();
  // If you navigate to /error?message=Something%20bad%20happened
  const { message } = useLocalSearchParams<{ message?: string }>();

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: 'white', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Something went wrong</Text>
      <Text style={{ color: '#b00', marginBottom: 16 }}>
        {message ? String(message) : 'An unexpected error occurred.'}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{ backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Go Back</Text>
      </Pressable>
    </View>
  );
}
