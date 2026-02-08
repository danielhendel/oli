# Phase 1 — Required UI Routes

**Authority:** `scripts/ci/assert-ui-routes.mjs`  
**Scope:** Phase 1 Expo Router route files (must exist).

---

## Tabs Shell

| Route | File | Purpose |
|-------|------|---------|
| Tabs layout | `app/(app)/(tabs)/_layout.tsx` | Bottom tab navigator |
| Dash | `app/(app)/(tabs)/dash.tsx` | System status, contextual counts |
| Timeline | `app/(app)/(tabs)/timeline/index.tsx` | Day list |
| Manage | `app/(app)/(tabs)/manage.tsx` | Manage placeholder |
| Library | `app/(app)/(tabs)/library/index.tsx` | Category list |
| Stats | `app/(app)/(tabs)/stats.tsx` | Stats placeholder |

---

## Library Browsing

| Route | File | Purpose |
|-------|------|---------|
| Library index | `app/(app)/(tabs)/library/index.tsx` | Category list |
| Category detail | `app/(app)/(tabs)/library/[category].tsx` | Events by category |

---

## Timeline Browsing

| Route | File | Purpose |
|-------|------|---------|
| Timeline index | `app/(app)/(tabs)/timeline/index.tsx` | Day list |
| Day detail | `app/(app)/(tabs)/timeline/[day].tsx` | Events for a day |

---

## Event Detail

| Route | File | Purpose |
|-------|------|---------|
| Event detail | `app/(app)/event/[id].tsx` | Canonical event + provenance |

---

## Lineage

| Route | File | Purpose |
|-------|------|---------|
| Lineage | `app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx` | Raw → canonical → derived explainability |

---

## Replay

| Route | File | Purpose |
|-------|------|---------|
| Replay day | `app/(app)/(tabs)/library/replay/day/[dayKey].tsx` | As-of truth for a day |

---

## Failures (Phase 1 Lock #2)

| Route | File | Purpose |
|-------|------|---------|
| Failures | `app/(app)/failures/index.tsx` | Failure memory UI; fail-closed on contract error (ErrorState with `isContractError`) |

**Tests:** `app/(app)/failures/__tests__/failures-screen-renders.test.tsx`, `failures-screen-fail-closed.test.tsx`  
**Contract:** `lib/contracts/failure.ts` (`failureListResponseDtoSchema`)

---

## Enforcement

- `node scripts/ci/assert-ui-routes.mjs` fails if any required file is missing.
