// apps/mobile/app/auth/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import AuthGate from '@/components/auth/AuthGate';

export default function AuthLayout() {
  return (
    <>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
