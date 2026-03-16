# Oura Pull-Now Timeout Audit

**Scope:** Staging; UID `1Uwhcp4OShV3QLz3VKMHWo5B3033`.  
**Proven runtime evidence:** Manual `POST /integrations/oura/pull-now` returns **504 upstream request timeout**. Logs at 16:05 show `oura_fetch_counts` (sleepDocCount: 38, readinessDocCount: 30) and `oura_ingest_item_counts` (sleepItemCount: 38, hrvItemCount: 30). After that: no `oura_vendor_snapshots_done`, no new ouraVendorSleep docs, no new lastRefreshAt/lastSnapshotAt. So the failure boundary is **after mapping, before or during the first heavy write phase**.

---

## 1. Proven failure boundary

The request fails **after** `oura_ingest_item_counts` is logged and **before** `oura_vendor_snapshots_done` is logged.

So the timeout occurs somewhere in this sequence:

1. **`writeOuraRawEvents(...)`** — awaited next (lines 409–415 in `ouraPullNow.ts`)
2. **`writeOuraVendorSleepSnapshots` / `writeOuraVendorReadinessSnapshots`** — awaited in `Promise.all` (lines 421–424)
3. **`oura_vendor_snapshots_done`** log (lines 432–453)
4. **Metadata write** `integrationRef.set(update)` (lines 458–468)
5. **Return 200** (lines 481–494)

Because `oura_vendor_snapshots_done` never appears, the timeout hits either:

- **During `writeOuraRawEvents`** (most likely: 38 + 30 + other items = 100+ sequential Firestore operations), or  
- **During the vendor snapshot `Promise.all`** (38 + 30 sequential writes), before the log runs.

So the **proven failure boundary** is: **somewhere between the start of `writeOuraRawEvents` and the `oura_vendor_snapshots_done` log** — i.e. during raw-event writes or during vendor snapshot writes.

---

## 2. Exact code after `oura_ingest_item_counts`

**File:** `services/api/src/routes/integrations/ouraPullNow.ts`

After the `oura_ingest_item_counts` log (lines 332–348), the next executed code is building more items (stepsItems, workoutItems, ouraRawItems) and then:

```typescript
  const { eventsCreated, eventsAlreadyExists } = await writeOuraRawEvents(
    uid,
    sleepItems,
    hrvItems,
    requestId,
    { stepsItems, workoutItems, ouraRawItems },
  );

  // Tier 1: Oura vendor snapshots for Sleep and Readiness screens (best-effort; do not break sync).
  let sleepResult = { attempted: 0, written: 0, skippedMissingDay: 0, errors: 0 };
  let readinessResult = { attempted: 0, written: 0, skippedMissingDay: 0, errors: 0 };
  try {
    const [sleepRes, readinessRes] = await Promise.all([
      writeOuraVendorSleepSnapshots(uid, sleepDocs ?? [], requestId),
      writeOuraVendorReadinessSnapshots(uid, readinessDocs ?? [], requestId),
    ]);
    sleepResult = sleepRes;
    readinessResult = readinessRes;
  } catch (snapErr) {
    logger.error({
      msg: "oura_vendor_snapshots_error",
      ...
    });
  }

  logger.info({
    msg: "oura_vendor_snapshots_done",
    ...
  });

  const totalSnapshotWritten = sleepResult.written + readinessResult.written;
  const meta = deriveOuraSyncMetadataFields(totalSnapshotWritten);

  try {
    const integrationRef = userCollection(uid, "integrations").doc("oura");
    const update: Record<string, unknown> = {
      lastRefreshAt: FieldValue.serverTimestamp(),
      ...
    };
    await integrationRef.set(update, { merge: true });
  } catch (metaErr) { ... }

  return { statusCode: 200, body: { ok: true, requestId, windowDays: WINDOW_DAYS, eventsCreated, eventsAlreadyExists } };
```

**Sequence after mapping:**

1. **`await writeOuraRawEvents(...)`** — blocks until all raw-event writes finish.
2. **`await Promise.all([writeOuraVendorSleepSnapshots(...), writeOuraVendorReadinessSnapshots(...)])`** — blocks until both snapshot writers finish.
3. **`logger.info({ msg: "oura_vendor_snapshots_done", ... })`** — only runs after (1) and (2).
4. **`await integrationRef.set(update, { merge: true })`** — one write.
5. **`return { statusCode: 200, ... }`** — response sent.

There are **no** other logs between `oura_ingest_item_counts` and `oura_vendor_snapshots_done`. So the absence of `oura_vendor_snapshots_done` implies the request is still inside (1) or (2) when the upstream/gateway timeout fires.

---

## 3. Most likely timeout point

**Most likely:** Timeout occurs **inside `writeOuraRawEvents`**.

**Reasoning:**

- **Volume:** 38 sleep + 30 HRV = 68 items; plus `stepsItems`, `workoutItems`, and `ouraRawItems` (personal, session, tag, spo2, heartrate over 30 days). That can easily be **100+ sequential Firestore operations** in one request.
- **Implementation:** `services/api/src/lib/ouraIngestWrite.ts` uses **strictly sequential** `for` loops with **per-doc `await rawEventsCol.doc(...).create(validated.data)`**. On create conflict it also does `await rawEventsCol.doc(...).get()`. So each item can be 1–2 round-trips. No batching.
- **Rough duration:** At ~50–150 ms per round-trip, 100+ ops → **5–15+ seconds** for raw events alone. Then 38 + 30 = 68 sequential snapshot writes (same pattern in `ouraVendorSnapshot.ts`: `for (const doc of docs) { await col.doc(snapshot.id).set(...) }`) → another **3–10 seconds**. Total **8–25+ seconds** on the critical path.
- **Client/gateway:** Client timeout is **30 s** (`lib/api/oura.ts`: `timeoutMs: 30000`). API Gateway (ESPv2) often has a **30–60 s** backend deadline when not overridden. So the combined work (raw + snapshots) can exceed the effective timeout, and the **first** heavy phase is `writeOuraRawEvents`, so that is the most likely place the timeout is hit.

**Second possibility:** Timeout during the snapshot `Promise.all` (38 + 30 sequential writes). That would still be consistent with “no `oura_vendor_snapshots_done`” and “no new snapshot docs.”

---

## 4. Whether gateway/API timeout settings are involved

**Yes.** The 504 is an “upstream request timeout”: the proxy (API Gateway or similar) gave up waiting for the backend.

- **Client:** `lib/api/oura.ts` line 67: `timeoutMs: 30000` (30 s). If the client aborts first, the app may surface a timeout; if the gateway aborts first, the client gets 504.
- **API Gateway (OpenAPI):** `infra/gateway/openapi.yaml` — `x-google-backend` does **not** set `deadline` or `timeout`. So ESPv2 uses its **default** backend deadline (commonly 30–60 s depending on version/config).
- **Cloud Run:** Deploy script `scripts/deploy/phase3a-withings-deploy-cloudrun.sh` does **not** pass `--timeout`; snapshot `docs/_snapshots/iam/run-services-us-central1.snapshot.json` shows `timeoutSeconds: 300` for a service. So Cloud Run can allow long requests; the limiting factor is the **gateway (or client)**.

**Conclusion:** Gateway (and possibly client) timeout settings are involved. The pull-now handler runs **fully synchronously** (raw writes → snapshot writes → metadata write → return). All of that must complete within the gateway’s (and client’s) timeout, so the current design is vulnerable when item counts are high (e.g. 38 sleep + 30 readiness + other datasets).

---

## 5. Minimal safe fix

**Option A (recommended): Move heavy work off the request path**

- **Respond quickly after mapping:** Once `sleepItems` / `hrvItems` (and optional steps/workout/ouraRawItems) are ready, **return 202 Accepted** (or 200 with a “sync started” style body) and send a short-lived token or request id.
- **Do raw writes + snapshot writes + metadata in the background:** E.g. fire-and-forget a continuation (in-process `void writeOuraRawEvents(...).then(...)` with no `await` on the HTTP path, or a small task queue / Cloud Task that performs the same steps). Ensure metadata and snapshot writes run in that background path so `lastRefreshAt` / `lastSnapshotAt` and vendor snapshots are still updated.
- **Idempotency:** Keep using the existing idempotency key so a repeated POST does not duplicate work; the background job can key off the same idempotency record.

**Option B (short-term): Add observability and, if needed, raise timeout**

- **Logs:** Add `logger.info({ msg: "oura_raw_events_write_start", uid, requestId, sleepCount, hrvCount, ... })` immediately before `writeOuraRawEvents`, and `logger.info({ msg: "oura_raw_events_write_done", uid, requestId, eventsCreated, eventsAlreadyExists })` immediately after. Add `oura_vendor_snapshots_start` before the `Promise.all` and keep `oura_vendor_snapshots_done` after. From the next run you can see whether the timeout is in raw writes or in snapshot writes.
- **Timeout:** If the product requirement is that pull-now must complete synchronously, consider raising the API Gateway backend deadline (and possibly client `timeoutMs`) so that 100+ sequential writes plus 68 snapshot writes can complete (e.g. 60–90 s). This is a stopgap; the code still does 100+ sequential operations and remains fragile to growth.

**Option C (medium-term): Reduce latency on the request path**

- **Batch Firestore writes:** Firestore allows up to 500 ops per `batch().commit()`. Refactor `writeOuraRawEvents` to build one or more batches for sleep, HRV, steps, workout, oura_raw and commit in batches instead of one `await create()` per doc. Similarly, batch snapshot writes in `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots` (e.g. one batch per collection, or multiple batches of N docs). This keeps the flow synchronous but shortens total time so it may stay under the gateway timeout.

**Conservative minimal fix:** Implement **Option B** (logs + optional timeout increase) so the next run pins down the exact phase that times out; then add **Option A** (respond then finish raw/snapshot/metadata in background) so pull-now no longer depends on completing 100+ writes within the gateway timeout. Option C can follow as an optimization if you want to keep a synchronous path with lower latency.

---

## 6. Verification steps

1. **Confirm timeout location (after implementing Option B logs):**  
   Trigger `POST /integrations/oura/pull-now` for the same UID and inspect logs:
   - If you see `oura_raw_events_write_start` but not `oura_raw_events_write_done` → timeout in `writeOuraRawEvents`.
   - If you see `oura_raw_events_write_done` but not `oura_vendor_snapshots_done` → timeout in the snapshot `Promise.all`.

2. **After moving work to background (Option A):**  
   Trigger pull-now; expect **202 or 200** within a few seconds. Then:
   - Poll or wait and check Firestore: `users/{uid}/rawEvents` (new sleep/hrv docs), `users/{uid}/ouraVendorSleep` and `ouraVendorReadiness`, and `users/{uid}/integrations/oura` (`lastRefreshAt`, `lastSnapshotAt`) updated.
   - Confirm no duplicate work when repeating the same idempotency key.

3. **Gateway/Cloud Run timeout (if raising timeout):**  
   If you increase the API Gateway backend deadline, redeploy the gateway config and re-run the same pull-now; confirm 200 and `oura_vendor_snapshots_done` and updated metadata in Firestore.

---

## Appendix: Exact references

| Item | File / location |
|------|------------------|
| Code after `oura_ingest_item_counts` | `services/api/src/routes/integrations/ouraPullNow.ts` lines 349–494 |
| `writeOuraRawEvents` call | `ouraPullNow.ts` lines 409–415 |
| `writeOuraRawEvents` implementation | `services/api/src/lib/ouraIngestWrite.ts` — sequential `for` loops with `await rawEventsCol.doc(...).create(validated.data)` (and on conflict `await ... .get()`) for sleep (52–112), hrv (115–172), steps (174–231), workout (233–294), ouraRawItems (296–348) |
| Snapshot writes call | `ouraPullNow.ts` lines 421–424: `Promise.all([writeOuraVendorSleepSnapshots(...), writeOuraVendorReadinessSnapshots(...)])` |
| `writeOuraVendorSleepSnapshots` | `services/api/src/lib/ouraVendorSnapshot.ts` — sequential `for (const doc of docs)` with `await col.doc(snapshot.id).set(snapshot, { merge: true })` (lines 106–128) |
| `writeOuraVendorReadinessSnapshots` | Same file — same pattern for readiness |
| `oura_vendor_snapshots_done` log | `ouraPullNow.ts` lines 432–453 |
| Metadata write | `ouraPullNow.ts` lines 456–468 |
| Client timeout | `lib/api/oura.ts` line 67: `timeoutMs: 30000` |
| Gateway config | `infra/gateway/openapi.yaml` — no backend `deadline` set |
| Cloud Run deploy | `scripts/deploy/phase3a-withings-deploy-cloudrun.sh` — no `--timeout` |
