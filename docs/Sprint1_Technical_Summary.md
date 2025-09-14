# Sprint 1 — Technical Summary (Design System + Auth Shell + Firebase Bootstrap)

**Goal**  
Establish the design system foundation (tokens, theming, base UI), wire a lightweight auth shell (Apple/Google buttons + stub), and stand up a robust Firebase bootstrap with **Emulator Suite** support — all App Store–quality and covered by type/lint/tests.

---

## 1) Design System Foundations

### Tokens
- **Path:** `lib/theme/tokens.ts`
- **What:** Typed tokens for color (light/dark palettes), spacing scale, radii, typography sizes/weights, shadows/elevation.
- **Why:** Single source of truth for visual language, accessible contrast targets, and stable app-wide styling.

### Theme System
- **Path:** `lib/theme/ThemeProvider.tsx`
- **Key APIs:**
  - `useTheme()` → `{ theme, colorSchemeSetting, setColorSchemeSetting }`
  - `ColorSchemeSetting` = `"system" | "light" | "dark"`
  - `ThemeProvider` wraps the app in `_layout.tsx`
  - `ThemeStatusBubble` (bottom-right) toggles System/Light/Dark
- **Behavior:** Detects system scheme, allows explicit override, exposes tokens through context, and animates small UI affordance. Nothing crashes in Expo Go; safe in production.

### Base UI Components
- **Text**
  - **Path:** `lib/ui/Text.tsx`
  - **Props:** `size`, `weight`, `tone`, `align`, `numberOfLines`
  - **Defaults:** Accessible colors per theme; scales correctly with Dynamic Type.
- **Button**
  - **Path:** `lib/ui/Button.tsx`
  - **Variants:** `primary | secondary | ghost`
  - **States:** `loading`, `disabled`
  - **A11y:** `accessibilityRole="button"`, focus/press feedback, generous `hitSlop`.
  - **Pure helper:** `getButtonStyles(variant, theme, disabled)` for testability.
- **Card**
  - **Path:** `lib/ui/Card.tsx`
  - **Variants:** `elevated | outline | plain` with proper radius/padding.

### Screens Integration
- **Home (`app/index.tsx`)** now uses `Text`, `Button`, `Card` and the theme.
- Header chrome follows device theme; content follows our ThemeProvider.

---

## 2) Auth Shell (non-prod)

### Provider
- **Path:** `lib/auth/AuthContext.tsx`
- **Exports:** `useAuth()` → `{ user, signIn (stub), signOut, signInWithApple, signInWithGoogle }`
- **Guarded route:** Demo (e.g., `/dashboard`) uses the stubbed auth state.

### Google
- **Path:** `lib/auth/google.ts`
- **API:** `getGoogleIdToken()` via **AuthRequest** flow (`loadAsync` + `promptAsync`); no deprecated `startAsync`.
- **Helper:** `buildGoogleAuthorizeUrl()` (pure, unit-tested) for diagnostics.
- **UI:** “Sign in with Google” button on Home (works once client IDs are added). Stub remains for development.

### Apple
- **UI:** Native Apple button (iOS) via `expo-apple-authentication` (plugin + `usesAppleSignIn: true` in `app.json`). Method is present in `AuthContext` but still non-prod (no server verification yet).

---

## 3) Firebase Bootstrap (modular v10+)

### Config Reader + Singletons
- **Path:** `lib/firebaseConfig.ts`
- **Reads:** `EXPO_PUBLIC_FIREBASE_*` **or** `app.json > expo.extra.firebase`
- **Emulator Toggle:** `app.json > expo.extra.useEmulators` or `EXPO_PUBLIC_USE_EMULATORS="true"`

### Key Behaviors
- **Safe init for emulators:** When emulators are on and real keys are missing, we initialize Firebase with **minimal options (projectId)** so paths are valid (no `projects//...` error).  
- **RN persistence:** Attempts `initializeAuth(app, getReactNativePersistence(AsyncStorage))` using dynamic `require` fallbacks; gracefully degrades to in-memory if not available (harmless during Sprint 1/Expo Go).
- **Emulator connections:** `connectAuthEmulator`, `connectFirestoreEmulator`, `connectStorageEmulator` using host from `extra.emulatorHost` (defaults to `localhost` for iOS Simulator).
- **Exports:** `getFirebaseApp()`, `getAuthInstance()`, `getDb()`, `getStorageInstance()`, `requireAuth()`.

### Dev Console Firestore Probe
- **Path:** `lib/dev/firebaseProbe.ts` (existing from Sprint 0)
- **UI:** On Home → “Run Firebase Probe” writes/reads a doc; now shows **SUCCESS [emulator]** with Emulator Suite running.

### Emulator Suite Setup
- **Files:**  
  - `firebase.json` — ports: Auth 9099, Firestore 8080, Storage 9199, UI 4000  
  - `firestore.rules` — permissive for local dev (not for prod)
- **Prereqs:** Java 17 (Temurin) installed; `firebase-tools` dev dependency.
- **Run:** `npx firebase emulators:start --project demo-oli`

---

## 4) `app.json` Changes (Auth + Theme + Emu)

```json
{
  "expo": {
    "scheme": "oli",
    "userInterfaceStyle": "automatic",
    "plugins": ["expo-router", "expo-apple-authentication"],
    "ios": { "usesAppleSignIn": true, "supportsTablet": true },
    "extra": {
      "firebase": {
        "apiKey": "",
        "authDomain": "",
        "projectId": "",
        "storageBucket": "",
        "messagingSenderId": "",
        "appId": ""
      },
      "useEmulators": true,
      "emulatorHost": "localhost",
      "sentryDsn": ""
    }
  }
}
