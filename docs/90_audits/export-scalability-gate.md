# Consumer account export — scalability gate (pre-release)

**Status:** OPEN  
**Stage:** 1B follow-on / pre-release reliability  
**Date:** 2026-08-29  
**Does not block Stage 1B engineering completion on branch** after physical E2E PASS; **does** block confident multi-user / large-account production export claims.

## Staging evidence (sanitized)

| Metric | Observation |
|--------|-------------|
| Successful archive size category | `50_to_200mb` (~161 MB) |
| Processing duration (started → completed) | ~78 s |
| Peak memory (failed attempt @ 1 GiB) | ~1210 MiB used → OOM |
| Peak memory (success @ 4 GiB) | Below limit (exact peak not exported in logs); worker configured **4 GiB** |
| Record volume | Broad: multi-collection user mirror + document originals packaged into one ZIP |
| Construction model | **Fully buffered** — collections loaded into memory; ZIP built in-process; then uploaded |

## Worker construction (as built)

`onAccountExportRequested`:

1. Loads listed Firestore collections for the user into memory.
2. Reads original document bytes into the package builder.
3. Builds a complete ZIP buffer.
4. Writes the object, verifies existence/size, then marks Ready.

There is **no** pagination of large collections and **no** streaming ZIP writer in the current path.

## Gate criteria (must pass before production export confidence)

1. Paginated / bounded reads for large collections (or proven size caps with honest failure).
2. Streaming or chunked archive construction (avoid holding full ZIP + collections simultaneously).
3. Memory budget documented with headroom vs largest expected staging/production account.
4. Load test: N concurrent exports without OOM / stuck `in_progress`.
5. Terminal status on all failure modes (including hard kill) within the stale-pending window.

## Staging mitigation already applied

- Memory raised to **4 GiB**; timeout **540 s**.
- API maps started-but-stuck pending to consumer failed after 10 minutes.
- Download IAM: API SA self TokenCreator + exports-bucket `objectViewer` only (bucket not public).
