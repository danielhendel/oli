# Data Access Layer (DAL) Map

Typed helpers that keep Firebase out of screens and aligned with security rules.

## Modules

### `lib/db/app.ts`
- `getFirebaseApp(): FirebaseApp`  
  Initializes Firebase once from `EXPO_PUBLIC_*` envs (or your env loader).

### `lib/db/firestore.ts`
- `db(): Firestore`  
  Singleton accessor for Firestore bound to the app instance.

### `lib/db/userContext.ts`
- `class UserDb(db, uid)`  
  - `userDoc()` → `users/{uid}`  
  - `subcol(path)` → `users/{uid}/{path}` collections

### `lib/db/events.ts` (append-only)
- `createEvent(db, uid, event): Promise<string>`  
  Appends an event to `/events` with `serverTimestamp()`.  
  **Writes allowed** (create only). **Updates forbidden** by rules.

### `lib/db/profile.ts`
- `upsertProfileGeneral(db, uid, data)`  
  Merges into `users/{uid}/profile/general` with `updatedAt`. **Client R/W**.
- `getProfileGeneral(db, uid): Promise<ProfileGeneral | null>`  
  Reads profile doc; returns `null` if not exists.

### `lib/db/logs.ts`
- `addWorkoutLog(db, uid, log)`  
  Adds `users/{uid}/logs/workouts/{logId}` with `createdAt`. **Client R/W**.
- `listRecentWorkouts(db, uid, limitN=20)`  
  Reads recent workouts (sorted by `date` DESC).

### `lib/db/facts.ts` (client read-only)
- `getDailyFact(db, uid, isoDate): Promise<FactDaily | null>`  
  Reads `users/{uid}/facts/daily/{isoDate}`. **Client read-only** (no write helpers).

## Usage example (keep Firebase out of screens)
```ts
import { db } from '@/lib/db';
import { addWorkoutLog } from '@/lib/db/logs';

export async function saveTodayWorkout(uid: string, log: WorkoutLog) {
  await addWorkoutLog(db(), uid, log);
}
