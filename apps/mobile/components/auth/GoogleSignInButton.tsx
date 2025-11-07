// apps/mobile/components/auth/GoogleSignInButton.tsx
import React, { useEffect, useState } from 'react';
import { Alert, TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirebaseAuth, ensureAuthInitialized } from '@/lib/firebaseClient';
import { mapFirebaseAuthError } from '@/lib/errors/mapFirebaseAuthError';
import { logEvent } from '@/lib/analytics/telemetry';

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  // IMPORTANT: keep scheme matching your app.config.ts
  const redirectUri = makeRedirectUri({ scheme: 'oli' });

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    responseType: 'id_token',
    scopes: ['profile', 'email'],
    redirectUri,
    selectAccount: true,
  });

  // Ensure auth is warmed (native) before we call signInWithCredential
  useEffect(() => {
    void ensureAuthInitialized();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (response?.type !== 'success') return;

      try {
        setLoading(true);

        const idToken = (response.params as Record<string, unknown>)?.['id_token'] as
          | string
          | undefined;

        if (!idToken) {
          const err = new Error('missing-id-token');
          (err as { code?: string }).code = 'google/missing-id-token';
          throw err;
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const auth = getFirebaseAuth();
        await signInWithCredential(auth, credential);

        logEvent('sign_in', { provider: 'google', status: 'success' });
      } catch (e: unknown) {
        logEvent('sign_in', {
          provider: 'google',
          status: 'error',
          code: (e as { code?: string })?.code ?? 'unknown',
        });
        Alert.alert('Google Sign In', mapFirebaseAuthError(e));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [response]);

  return (
    <TouchableOpacity
      onPress={() => promptAsync()}
      disabled={!request || loading}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      style={{
        height: 48,
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {loading ? <ActivityIndicator /> : null}
        <Text>Sign in with Google</Text>
      </View>
    </TouchableOpacity>
  );
}

export default GoogleSignInButton;
