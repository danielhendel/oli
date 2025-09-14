# Oli — Sprint 0 Technical Spec

> Goal: Ship a production-quality foundation that boots instantly, scales cleanly, and enforces quality from day one.

## 1) Architecture Snapshot
**Frontend:** Expo Router v2 + React Native + TypeScript  
**Backend:** Firebase (Auth, Firestore, Storage), Emulator Suite toggle  
**Tooling:** ESLint v9 flat config, Prettier, Jest (jest-expo), GitHub Actions CI  
**Observability:** Monitoring facade (Sentry placeholder; Expo-safe)

### Project Tree (key paths)
- `app/_layout.tsx` — Root layout; wraps `<Stack />` with `AuthProvider`; calls `initMonitoring()`
- `app/index.tsx` — Home + Dev Console (Firebase probe)
- `app/dashboard.tsx` — Guarded route example (requires `user`)
- `lib/auth/AuthContext.tsx` — Stub auth provider (swap to Firebase Auth later)
- `lib/firebaseConfig.ts` — Single source of truth; reads EXPO_PUBLIC_* or `expo.extra.firebase`; emulator toggle
- `lib/dev/firebaseProbe.ts` — Firestore write/read probe used by Dev Console
- `lib/monitoring/index.ts` — Monitoring facade (`initMonitoring`, `captureError`)
- `lib/util/clamp.ts` + `lib/util/__tests__/clamp.test.js` — Unit test
- `eslint.config.mjs`, `tsconfig.json`, `.prettierrc.json`, `.github/workflows/ci.yml`

## 2) Quality Gates (HealthOS Great Code Standard)
- **Types First:** strict TS enabled; `exactOptionalPropertyTypes` respected.
- **Boundaries:** Firebase singletons; UI uses `getDb()` only via dev probe; auth via context.
- **Error Handling:** Emulator connectors in try/catch with clear WARN logs; probe returns typed `ProbeResult`.
- **State/Effects:** Hooks follow exhaustive-deps; `AuthProvider` memoized; Router in `_layout` only.
- **Performance Basics:** Singletons avoid re-init; no blocking awaits in render.
- **Accessibility & Polish:** Buttons have `accessibilityRole`, screen root marked `accessible`.
- **Security/Privacy:** No secrets in repo; EXPO_PUBLIC_* or `expo.extra.firebase`. Placeholder monitoring only.
- **Tests & Guards:** Jest installed; at least one true unit test; CI runs on PRs/push.
- **Docs & Conventions:** This spec + acceptance checklist; consistent scripts.
