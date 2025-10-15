/**
 * Google Sign-In (iOS) — PKCE "authorization code" flow (iOS client only)
 * Uses the iOS reverse scheme + `/oauth2redirect/google` for both steps.
 * UI: dark button to match Apple (white icon + text, no white background)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Application from 'expo-application';
import { GoogleAuthProvider, signInWithCredential, getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { logEvent } from '../../lib/analytics/telemetry';
import { mapFirebaseAuthError } from '../../lib/errors/mapFirebaseAuthError';

WebBrowser.maybeCompleteAuthSession();

// ---- Constants --------------------------------------------------------------
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string;

// Reverse-client URL scheme must match Info.plist CFBundleURLTypes entry.
const IOS_REVERSED_CLIENT_SCHEME =
  'com.googleusercontent.apps.391788417686-bkkbgouneck7nm7td9rsdfvt0ej6e3tg';

// Use the GIS-preferred iOS redirect path:
const REDIRECT_URI_DEFAULT = `${IOS_REVERSED_CLIENT_SCHEME}:/oauth2redirect/google`;

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

async function exchangeCodeWithClient(params: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
}) {
  const { code, redirectUri, codeVerifier, clientId } = params;

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    const err = new Error(json.error_description || json.error || 'Token exchange failed');
    (err as any).code = json.error || 'token_exchange_failed';
    (err as any).response = json;
    throw err;
  }

  return json as { id_token?: string };
}

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    console.log('[app] bundleIdentifier =>', Application.applicationId);
    console.log('[google] using iOS client ID =>', IOS_CLIENT_ID);
  }, []);

  // Request: PKCE code flow (no id_token response type)
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    responseType: 'code',
    usePKCE: true,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
    redirectUri: REDIRECT_URI_DEFAULT,
  });

  useEffect(() => {
    (async () => {
      if (!response || response.type !== 'success') return;
      if (handledRef.current) return; // guard double-handling in dev
      handledRef.current = true;

      try {
        setLoading(true);

        const code = (response as any)?.params?.code as string | undefined;
        const codeVerifier = request?.codeVerifier as string | undefined;

        // Use the *exact* redirect Google used for the request; fall back to default if absent
        const redirectUriUsed =
          (request?.redirectUri as string | undefined) ?? REDIRECT_URI_DEFAULT;

        // Debug: verify everything lines up
        console.log('[google] DEBUG request.clientId =>', (request as any)?.clientId);
        console.log('[google] DEBUG redirectUri used by request =>', request?.redirectUri);
        console.log('[google] DEBUG redirectUri we will exchange with =>', redirectUriUsed);
        console.log(
          '[google] DEBUG code len, verifier len =>',
          code?.length ?? 0,
          codeVerifier?.length ?? 0
        );

        if (!code || !codeVerifier) {
          throw Object.assign(new Error('missing-auth-code-or-verifier'), {
            code: 'google/missing-code-or-verifier',
          });
        }

        // Exchange authorization code for tokens using the iOS client only
        const tokenRes = await exchangeCodeWithClient({
          code,
          redirectUri: redirectUriUsed,
          codeVerifier,
          clientId: IOS_CLIENT_ID,
        });

        const idToken = tokenRes.id_token as string | undefined;
        if (!idToken) {
          throw Object.assign(new Error('missing-id-token'), {
            code: 'google/missing-id-token',
          });
        }

        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(getAuth(), credential);

        logEvent('sign_in', { provider: 'google', status: 'success' });
        console.log('[google] Firebase sign-in success');
      } catch (e: any) {
        console.log('[google] sign-in error =>', e?.message || e, e?.response || '');
        logEvent('sign_in', { provider: 'google', status: 'error', code: e?.code ?? 'unknown' });
        Alert.alert('Google Sign In', mapFirebaseAuthError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [response, request]);

  const onPress = () => {
    if (loading || !request) return;
    setLoading(true);
    (promptAsync as any)({ preferEphemeralSession: true }).finally(() => setLoading(false));
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!request || loading}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      style={[styles.button, (!request || loading) && styles.buttonDisabled]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#fff" />
            <Text style={styles.text}>Sign in with Google</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    width: '100%',
    backgroundColor: '#111', // dark to match Apple button
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2D2D2D',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default GoogleSignInButton;
