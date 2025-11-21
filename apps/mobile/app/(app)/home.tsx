// apps/mobile/app/(app)/home.tsx
/**
 * Purpose: Simple post-login home with “Log out” action.
 * Side-effects: Calls lib/auth/actions.signOutUser
 * Errors: Shows inline error if sign-out fails
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { signOutUser } from '@/lib/auth/actions';

export default function Home() {
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    try {
      setBusy(true);
      await signOutUser();
    } catch (e) {
      Alert.alert('Sign out failed', (e as Error).message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex:1, padding:20, gap:16, justifyContent:'center' }}>
      <Text style={{ fontSize:24, fontWeight:'600' }}>Welcome to Oli</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onSignOut}
        disabled={busy}
        style={{ backgroundColor:'#111', padding:14, borderRadius:12, opacity: busy ? 0.6 : 1 }}
      >
        <Text style={{ color:'#fff', textAlign:'center' }}>{busy ? 'Signing out…' : 'Log out'}</Text>
      </Pressable>
    </View>
  );
}
