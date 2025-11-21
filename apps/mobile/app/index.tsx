// apps/mobile/app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // When the app opens to oli:/// (no path), go to auth.
  return <Redirect href="/auth/sign-in" />;
}
