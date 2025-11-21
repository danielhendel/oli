// apps/mobile/app/(app)/index.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeDashboard() {
  const r = useRouter();

  return (
    <View style={{ flex: 1, padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: '800' }}>Home</Text>
      <Text style={{ fontSize: 16, color: '#666' }}>
        Welcome to Oli. Choose where to go:
      </Text>

      <Pressable
        onPress={() => r.push('/(app)/profile')}
        style={{ backgroundColor: '#111', padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: 'white', fontSize: 16 }}>Profile</Text>
      </Pressable>

      <Pressable
        onPress={() => r.push('/(app)/profile/general')}
        style={{ backgroundColor: '#111', padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: 'white', fontSize: 16 }}>Edit General Profile</Text>
      </Pressable>

      {/* Stubs for coming features */}
      <Pressable
        onPress={() => r.push('/(app)/workouts')}
        style={{ backgroundColor: '#efefef', padding: 14, borderRadius: 12 }}
      >
        <Text style={{ fontSize: 16 }}>Workouts (coming soon)</Text>
      </Pressable>

      <Pressable
        onPress={() => r.push('/(app)/nutrition')}
        style={{ backgroundColor: '#efefef', padding: 14, borderRadius: 12 }}
      >
        <Text style={{ fontSize: 16 }}>Nutrition (coming soon)</Text>
      </Pressable>
    </View>
  );
}
