// types/firebase-auth-react-native.d.ts
// Minimal typings so TS can resolve the RN persistence helper.
declare module "firebase/auth/react-native" {
    import type { Persistence } from "firebase/auth";
    // getReactNativePersistence returns a Persistence object using the provided storage.
    export function getReactNativePersistence(storage: unknown): Persistence;
  }
  