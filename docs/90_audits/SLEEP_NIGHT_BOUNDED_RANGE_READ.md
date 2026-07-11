# SleepNight Bounded Range Read API

**Date:** 2026-07-11  
**Branch:** `feat/sleep-night-range-api`  
**Scope:** Backend foundation to replace client per-day SleepNight fan-out

## Purpose

Authenticated clients that need Sleep overview or Profile Health Baseline currently call exact-day `GET /users/me/sleep-night` once per calendar day. Missing days produce many individual 404 responses. This note documents the bounded range endpoint that returns a sparse list in one request.

## Endpoint

`GET /users/me/sleep-nights?start=YYYY-MM-DD&end=YYYY-MM-DD`

- Inclusive `[start, end]`
- Policy max: **90** inclusive calendar days (`SLEEP_NIGHT_RANGE_MAX_DAYS`)
- Auth: Firebase (same as other `/users/me` reads)
- Success: **200** with `{ start, end, dayCount, resolvedCount, nights[] }`
- Missing days: **omitted** from `nights` (no per-day 404)
- Validation failures / oversize span: **400**

## Storage / read path

- Collection: existing `users/{uid}/sleepNights/{anchorDay}` only
- Per requested day: same resolution rules as exact-day `GET /users/me/sleep-night`
- Prefetch window: `start-2` through `end` (wake-day lookback)
- Physiology hydrate for range: vendor readiness + dailyFacts only — **no `rawEvents` reads**
- No new Firestore collection; no Firestore rules change in this change set

## Privacy

Route logs may include version tag and `dayCount` only. Do not log UIDs, date strings, health values, document IDs, or tokens.

## Out of scope

- Client fan-out replacement (dashboard / hooks)
- `sleep-day-refresh` HTTP 500
- Gateway deploy, Oura refresh, or data backfill
- Production push / PR (local commit only until push review)
