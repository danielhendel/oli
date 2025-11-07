// apps/mobile/app/auth/sign-in.tsx
/**
 * Purpose: Email/Password + Apple sign-in wired to typed actions.
 * Errors: Maps Firebase & provider errors to friendly strings.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { signInEmailPassword } from '@/lib/auth/actions';
import { mapFirebaseAuthError } from '@/lib/errors/mapFirebaseAuthError';
import { signInWithApple } from '@/lib/auth/oauth/apple'; // native flow

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  async function tryEmail() {
    try {
      setBusy(true);
      await signInEmailPassword(email, pw);
    } catch (e) {
      Alert.alert('Sign in failed', mapFirebaseAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function tryApple() {
    try {
      setBusy(true);
      await signInWithApple();
    } catch (e) {
      Alert.alert('Apple Sign-In', mapFirebaseAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex:1, padding:24, justifyContent:'center', gap:12 }}>
      <Text style={{ fontSize:32, fontWeight:'700', marginBottom:12 }}>Oli</Text>

      <TextInput
        accessibilityLabel="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth:1, borderColor:'#e6e6e6', padding:12, borderRadius:10 }}
      />
      <TextInput
        accessibilityLabel="Password"
        secureTextEntry
        placeholder="••••••••"
        value={pw}
        onChangeText={setPw}
        style={{ borderWidth:1, borderColor:'#e6e6e6', padding:12, borderRadius:10 }}
      />

      <Pressable
        accessibilityRole="button"
        onPress={tryEmail}
        disabled={busy}
        style={{ backgroundColor:'#111', padding:14, borderRadius:12, opacity: busy ? 0.6 : 1 }}
      >
        <Text style={{ color:'#fff', textAlign:'center' }}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={tryApple}
        disabled={busy}
        style={{ backgroundColor:'#000', padding:14, borderRadius:12, marginTop:4, opacity: busy ? 0.6 : 1 }}
      >
        <Text style={{ color:'#fff', textAlign:'center' }}>Sign in with Apple</Text>
      </Pressable>
    </View>
  );
}
