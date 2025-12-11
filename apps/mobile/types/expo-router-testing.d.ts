// types/expo-router-testing.d.ts
// Test-only + app helper types so TS knows about expo-router exports we use.

declare module 'expo-router' {
    // Core router components/hooks we use in the app
    export const Slot: any;
    export const Stack: any;
    export const Redirect: any;
    export const Link: any;
  
    export function useRouter(): any;
    export function usePathname(): string;
    export function useSegments(): any;
  
    // Jest-only helpers we attach in jest-setup.ts
    export const __mockReplace: jest.Mock<any, any>;
    export const __mockUsePathname: jest.Mock<any, any>;
  }
  