// apps/mobile/app/(app)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import AuthGate from '@/components/auth/AuthGate';

export default function AppLayout() {
  return (
    <>
      <AuthGate />
      <Stack
        screenOptions={{
          headerShown: false, // 🔴 hide the native header, use our custom one
        }}
      />
    </>
  );
}
