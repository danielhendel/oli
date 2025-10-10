// apps/mobile/types/firebase-react-native.d.ts
declare module 'firebase/auth/react-native' {
    // Minimal type surface we need for RN persistence
    export function getReactNativePersistence(storage: unknown): unknown;
  }
  