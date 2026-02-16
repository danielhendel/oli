// components/GoogleSignInButton.tsx
import React from "react";
import Button from "@/lib/ui/Button";
import { Text } from "@/lib/ui/Text";
import { getGoogleIdToken } from "@/lib/auth/google";

type Props = { onIdToken: (idToken: string) => Promise<void>; label?: string };

export default function GoogleSignInButton({ onIdToken, label = "Continue with Google" }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const onPress = React.useCallback(async () => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      const { idToken } = await getGoogleIdToken();
      await onIdToken(idToken);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, onIdToken]);

  return (
    <>
      <Button label={busy ? "Signing in…" : label} onPress={onPress} disabled={busy} />
      {err ? (
        <Text tone="danger" style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
          {err}
        </Text>
      ) : null}
    </>
  );
}
