# Sprint 1 — Authentication & Identity (Frontend Foundation)

**Repo:** github.com/danielhendel/oli  
**Milestone:** v0.2.0 (foundations + prod Firestore health probe)  

## Objectives
- Expo Router v2 app at `apps/mobile/` with strict TypeScript.
- Theme + typography tokens (light/dark-ready).
- Screens: `/`, `/auth/sign-in`, `/auth/sign-up`, `/settings`.
- Firebase client init via Expo public env vars.
- Auth provider with `onAuthStateChanged`, RN persistence.
- Email/Password auth with friendly error UX.
- Unit test for error mapping.
- CI path-scoped mobile checks.

## Steps taken
- Created Expo app scaffold with Router v2 and Theming.
- Implemented `firebaseClient.ts` singleton using `initializeAuth` + AsyncStorage.
- Built AuthProvider and guarded navigation on `/` & `/settings`.
- Implemented Sign In/Up forms with mapped errors and loading states.
- Added unit test for the error mapper.
- Extended CI to run mobile checks only when `apps/mobile/**` changes.

## Acceptance checklist
- [ ] `npm run typecheck` / `npm run lint` / `npm test` pass locally (mobile).
- [ ] `expo start` boots, iOS sim opens, navigation works.
- [ ] Sign up/in/out works against Firebase Auth.
- [ ] Home shows signed-in email; Settings can sign out.
- [ ] CI PR shows green for mobile job when mobile files change.

## Why it matters
This is the first user-visible slice that proves the app’s health loop can authenticate real users and maintain sessions. It’s the foundation for data models, logging flows, and integrations in Sprints 2–4. 
