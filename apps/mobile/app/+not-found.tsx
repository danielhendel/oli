import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function NotFound() {
  const { user } = useAuth();
  return <Redirect href={user ? '/(app)/home' : '/auth/sign-in'} />;
}
