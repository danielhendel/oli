// apps/mobile/app/(app)/profile/index.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileHub() {
  const r = useRouter();
  return (
    <View style={{ flex:1, padding:20, gap:12 }}>
      <Text style={{ fontSize:24, fontWeight:'700' }}>Profile</Text>
      <Pressable onPress={() => r.push('/(app)/profile/general')}>
        <Text style={{ fontSize:16 }}>General</Text>
      </Pressable>
      {/* Training, Metabolic tabs can route similarly */}
    </View>
  );
}
