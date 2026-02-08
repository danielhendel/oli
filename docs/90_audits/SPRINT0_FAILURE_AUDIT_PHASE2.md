# Sprint 0 Failure Audit — Phase 2 (Compute & Runtime)

**Focus:** Why `rawEvents` existed but derived truth did not compute  
**Resolution:** Eventarc → Cloud Run IAM misconfiguration (Gen2)

---

## Observed State

At the start of Phase 2 investigation:

- `rawEvents` documents were present in Firestore.
- No canonical events were created.
- No `dailyFacts` documents existed.
- No `intelligenceContext` documents existed.
- No Cloud Function execution logs were present.

This indicated that ingestion succeeded, but the compute pipeline never executed.

---

## Investigation

### Cloud Run Request Logs

Cloud Run request logs for the Gen2 backend `onraweventcreated` showed repeated entries:

