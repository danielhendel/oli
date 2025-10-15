// apps/mobile/app/profile/index.tsx
import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Link } from 'expo-router';

export default function ProfileHub() {
  return (
    <View style={{ flex:1, padding:16 }}>
      {[
        { to: '/profile/general', label: 'General' },
        { to: '/profile/training', label: 'Training' },
        { to: '/profile/metabolic', label: 'Metabolic' },
      ].map(({ to, label }) => (
        <Link key={to} href={to} asChild>
          <Pressable accessibilityRole="button" style={{ padding:16, backgroundColor:'#1f1f1f', borderRadius:12, marginBottom:12 }}>
            <Text style={{ color:'white', fontSize:18 }}>{label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
