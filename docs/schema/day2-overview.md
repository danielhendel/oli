# Oli Data Model (Day 2 overview)

## Why this shape
- Everything is anchored to the user: `/users/{uid}`.
- **Events** capture raw history (append-only logs).
- **Facts** are normalized rollups derived from events (daily/weekly/…).
- Intelligence layers sit on top of facts. This structure is future-proof and non-breaking.

## Top-level tree
/users/{uid}
  ├─ (fields…) ← the living profile (demographics, prefs, goals, connections)
  ├─ events/ {autoId}
  └─ facts/  {factId}

These paths match our code helpers and rules:
- `profileDoc(uid)` → `/users/{uid}`
- `eventsCol(uid)`  → `/users/{uid}/events`
- `factsCol(uid)`   → `/users/{uid}/facts`

## Events
Append-only log entries. Minimal envelope + typed payload.

Common envelope (stored on each event):
- `type`: "workout" | "cardio" | "nutrition" | "recovery" | "measurement" | "sleep" | "file_upload"
- `uid`: string (must match the path owner)
- `ts`: Firestore server timestamp
- `version`: 1
- `source`: "manual" | "oura" | "withings" | "apple_health" | "import" | "system"
- `ymd`: "YYYY-MM-DD" (UTC) — used by rollups

Example workout event doc:
{
  "type": "workout",
  "uid": "<uid>",
  "ts": <serverTimestamp>,
  "version": 1,
  "source": "manual",
  "ymd": "2025-09-21",
  "payload": {
    "name": "Push A",
    "focusAreas": ["chest","triceps"],
    "durationMin": 52,
    "exercises": [
      { "name": "Flat Barbell Bench", "sets": [ { "reps": 10, "weight": 135 }, { "reps": 8, "weight": 155 } ] },
      { "name": "Cable Fly", "sets": [ { "reps": 15, "weight": 25 } ] }
    ],
    "notes": "Good pump"
  }
}

Notes:
- We use discriminated unions in TypeScript for `payload` by `type` (see Step 2).
- The `ymd` key is required for fast daily aggregation.

## Facts
Derived summaries keyed for fast lookups. First fact: daily summary.

Fact id convention: `daily.summary.v1:<YYYY-MM-DD>`

Example daily summary fact:
{
  "kind": "daily.summary.v1",
  "date": "2025-09-21",
  "value": {
    "workouts": 1,
    "cardioSessions": 0,
    "nutritionLogs": 3,
    "recoveryLogs": 1
  },
  "uid": "<uid>",
  "version": 1,
  "source": "derived",
  "ts": <serverTimestamp>
}

## Profile (on /users/{uid})
Living record for the user (not a subcollection). Examples:
- Basics: name, dob, sex, height, weight
- Preferences: units, devices allowed, data-sharing
- Goals: primary goal, timeline, weekly frequency
- Connections: each integration’s status lives under `/users/{uid}/integrations/{provider}` (no secrets)

## Rules posture (draft)
- Users can read/write their own `/users/{uid}` subtree.
- Events: create allowed with valid base shape; updates must preserve `type` and `ymd` (we don’t mutate history).
- Facts: upsert allowed for the user; typically written by backend jobs.

(We’ll drop the full `firestore.rules` in Step 3.)
