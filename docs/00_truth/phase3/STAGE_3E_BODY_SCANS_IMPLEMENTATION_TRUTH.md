# Stage 3E — Body Scans Foundation V1: Implementation Truth

**Status:** implemented on `feat/body-composition-stage3e-body-scans-v1`; **not merged**; production `bodyScans` flag **disabled**.

**Authority:** subordinate to `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`. This document records what the code actually does, not what is planned.

**Base:** `5835051715ceea5e1a1cece12f28a9af53e206e7` (Stage 3C merge), docs-only commit `6c17349e`.

**Foundation truth freeze:** `docs/00_truth/phase3/STAGE_3E_WAIST_INDEX_BODY_SCAN_FOUNDATION_TRUTH_FREEZE.md` — physically approved runtime SHA `e9397b357642b45eef2a6a40c78217281b375d91` (**PASS**); initial docs-only freeze SHA `0fabe4721c311a1a6a8f77a72cc600683e659224`. Evidence Resolver **IMPLEMENTED** (scientific re-gate PASS at `3ae4737b…`; docs freeze re-gate **PASS** at `49751716…` — `docs/00_truth/phase3/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1_TRUTH_FREEZE.md`); Assessment Confidence **implementation PASS** at `dc506bbe…` · independent re-gate **PASS** · docs truth-freeze re-gate **PASS** at `d2b0b3abba958c9ac80ec5401f90ad5227a1a0a8` (`docs/00_truth/phase3/BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1_TRUTH_FREEZE.md`); Dual Score scientific correction **PASS** at `6fa8cb22…` (Independent Scientific Re-Gate V2 **PASS**); final mathematical truth freeze **CREATED / PENDING INDEPENDENT REVIEW** (`docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md`); Health / Performance-Supporting score implementation: **STILL BLOCKED** until mathematical freeze re-gate PASS; public numeric scores: **NO-GO**; public numeric scores **NOT READY**.

---

## 1. What a user can do

Upload a scan report (PDF) from Body Composition → Body Scans, review the values the adapter read, correct anything that differs, save them, open the original report, re-read the report, and delete the scan. Nothing is recorded until the user explicitly confirms it.

### Navigation hierarchy (category-first)

```text
Body Composition
      ↓
Body Scan category (DXA / InBody / Evolt / Bod Pod / Other)
      ↓
Category history (newest first)
      ↓
Individual scan result
```

Landing and hub show a compact grouped category list (stable order). Each category
row is backed by an **owner-scoped `scanType` + `limit=1` summary query** that proves
emptiness or returns the true latest item under server sort — never a truncated mixed
global page. Exact scan counts are omitted in V1 unless an authoritative total exists.
Category history uses the same list endpoint with `scanType` + cursor pagination so
every prior scan is reachable. Category rows open type-specific history. Add from the
section opens a category chooser; Add from a category page opens upload with
`?scanType=` preselected. Invalid `scanType` routes fail closed to the Body Scans hub.

Product category is separate from scientific method. `preferredScanType` is an
untrusted navigation/report-family hint: it may provisionally place a scan in a
category when no detector candidate exists, but it must **never** alone establish
scientific `method` (e.g. preferred InBody must not invent `method=bia`). Detector or
explicit user-confirmed provenance governs method. Preference vs detector conflicts
emit `body_scan_type_preference_conflict` (category tokens + status only).

Routes: `/(app)/body/scans`, `/(app)/body/scans/type/[scanType]`, `/(app)/body/scans/new`, `/(app)/body/scans/[scanId]`, `/(app)/body/scans/[scanId]/review`, `/(app)/body/scans/[scanId]/report`. The former `/(app)/body/dexa` and `/(app)/scans` placeholders now redirect into this experience.

List contract: `GET /users/me/body-scans?scanType=&limit=&cursor=` returns
`{ items, nextCursor, hasMore }`. Sort is `createdAt` desc with document-id
`startAfter` tie-break (UI labels prefer `performedAt` when present). Composite
Firestore index: `bodyScans` `scanType` ASC + `createdAt` DESC. Default page 25,
max 50. Gateway OpenAPI documents the query params (Gateway deploy required when this
branch ships).

### Category cache freshness (mutation invalidation)

Mounted category summaries and histories subscribe to a unified client bus
(`invalidateBodyScanList` / `subscribeBodyScanListInvalidation`). Successful
upload, confirm, reprocess, and delete publish reason + category tokens only
(no IDs, UID, filenames, values, cursors, or paths). Same-tick publishes coalesce.
Category history resets to the first page (`cursor = null`) on invalidation and
never appends onto stale pages. Body Composition pull-to-refresh includes
`bodyScanSummaries.refetch`. Body Scans hub and category-history screens also
refetch on focus. Query completion does not re-publish invalidation.

### Scroll ownership (runtime containment)

Every Body Scan screen has exactly one primary vertical scroll owner.
Category history uses `ModuleScreenShell` with `bodyScrollEnabled={false}` and a
root `FlatList` that owns pagination, Load More, Retry, and end-of-history.
Scan result and Review keep one shell `ScrollView` with ordinary mapped Views
(no nested vertical `FlatList`/`SectionList`). Warning suppression
(`LogBox.ignoreLogs`, console monkey-patches, `nestedScrollEnabled` as the sole
fix, `disableVirtualization`) is prohibited. Physical retest at
`e9397b357642b45eef2a6a40c78217281b375d91` proved the VirtualizedLists nesting
warning absent without suppression (**B-BODY-SCAN-SCROLL-CONTAINMENT-01**
PHYSICALLY CLOSED).

Evidence Resolver is **IMPLEMENTED** elsewhere (scientific re-gate PASS at
`3ae4737b…`; docs freeze re-gate **PASS** at `49751716…` — `docs/00_truth/phase3/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1_TRUTH_FREEZE.md`). Assessment Confidence: **implementation PASS** at `dc506bbe…` · independent re-gate **PASS** · docs truth-freeze re-gate **PASS** at `d2b0b3abba958c9ac80ec5401f90ad5227a1a0a8`; Dual Score scientific correction **PASS** at `6fa8cb22…` (Independent Scientific Re-Gate V2 **PASS**); final mathematical truth freeze **CREATED / PENDING INDEPENDENT REVIEW** (`docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md`); Health / Performance-Supporting score implementation: **STILL BLOCKED** until mathematical freeze re-gate PASS; public numeric scores: **NO-GO**.

---

## 2. Architecture reuse (no parallel stack)

Body Scans ride the existing Document Ingestion OS rather than introducing a second upload, storage, or extraction path.

| Concern | Reused component |
|---------|------------------|
| Domain / type contracts | `lib/contracts/documents.ts` (`scans` / `dexa_report`) |
| Upload | `useDocumentUploadFlow`, `POST /users/me/documents/upload-intent` → `complete-upload` |
| Storage | `users/{uid}/documents/{documentId}/original` (Model A, Admin SDK only; `storage.rules` deny-all) |
| PDF text | `services/api/src/lib/labs/pdfTextExtraction.ts` (pdfjs) |
| Parser registry | `services/api/src/lib/documents/documentParsers.ts` |
| Ingestion job state machine | `services/api/src/lib/documents/runDocumentIngestion.ts` |
| Export / delete | `DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS` + `documentAccountStoragePrefixes` |
| Feature flag pattern | `lib/data/documents/documentIngestionOsFlag.ts` / `labsOsFlag.ts` |

`scans` was added to `DOCUMENT_UPLOAD_ENABLED_DOMAINS`; `dna`, `medications`, `supplements`, `medical_history`, and `other_health_record` remain deferred.

A scan shares its identifier with its source document (`scanId === documentId`), so reprocess, delete, export, and view-original linkage need no second id space.

---

## 3. Data model

| Store | Contents |
|-------|----------|
| `users/{uid}/bodyScans/{scanId}` | The scan record: type, method, device, scan date, status, confirmed metrics |
| `users/{uid}/bodyScanDrafts/{draftId}` | Adapter output — candidates awaiting the user's review, never truth |
| `users/{uid}/bodyScanFacts/fact_{scanId}` | Confirmed measurements, carrying `excludedFromContinuousTrends: true` |

Statuses: `uploading → processing → needs_review → verified`, with `failed`, `deleting`, and `deleted`. A draft never yields `verified`; only an explicit user confirmation does.

Metrics cover percent fat, fat mass, lean mass, total mass, bone mineral content, bone mineral density, visceral fat mass, and android/gynoid ratio across total, head, trunk, android, gynoid, arms, legs, and each limb.

---

## 4. Extraction

`live_lean_rx_dxa` reads a GE Lunar / Live Lean Rx style **text layer**. It maps the report's own column header onto metrics, so tissue-only columns that exclude bone can never be mistaken for region values, and falls back to the labelled total-body indices when the table header is lost.

There is no OCR in Stage 3E. An image-only PDF has no text to read: the adapter declines, the document cascades to the unsupported-scan parser, the original is kept, and the scan lands in manual review. InBody, Evolt, and Bod Pod reports take the same path.

What the extractor will not do: infer a missing value, convert a missing value to zero, guess a day/month-ambiguous scan date, rename Lean Mass, or emit a score, band, percentile, or diagnosis.

Fixtures are synthetic and de-identified (`lib/data/body-scans/__fixtures__/liveLeanRxDxaSynthetic.ts`). No real report has been committed, and `lib/data/body-scans/__tests__/fixturePolicy.test.ts` fails the build if one ever is.

---

## 5. Review and confirmation

Every value the adapter was unsure of (confidence at or below `0.8`, or unreadable) starts unacknowledged; the user must tick it before saving. Clearing a field records it as not measured rather than as zero. A non-numeric entry blocks saving with an explanation. The server independently rejects a confirmation that leaves flagged fields unaddressed (`422`) and refuses to confirm a scan that is no longer awaiting review (`409`).

Reprocess invalidates previously confirmed metrics and any prior scan facts: the report must be reviewed again.

---

## 6. Trend isolation

A scan is measured on a different instrument from the scale a user steps on each morning, so scan values never become samples on the Weight, Body Fat, or Lean Mass trends.

This is enforced three ways: `assertBodyScanWriteTargetAllowed` guards every Body Scan write and fails closed on an unknown collection; Firestore rules deny direct client access to all three stores so scans are reachable only through the API; and **CHECK 23** statically blocks Body Scan code from targeting derived or canonical collections and blocks trend/daily-fact code from reading a Body Scan store. Mapped as **I-21** in `docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md`.

---

## 7. View Original

`GET /users/me/documents/{documentId}/view-original` mints a signed read URL valid for **120 seconds** for the owner's private object, or reports `VIEW_ORIGINAL_NOT_STORED` / `VIEW_ORIGINAL_UNAVAILABLE`. The client downloads it into an **account-scoped app-private cache** and presents the local file in an **Oli-owned PDFKit viewer**. The URL and the object path never appear in logs, telemetry, outcomes, or user-facing copy.

### Approved viewer architecture (Stage 3E V1) — Apple PDFKit

**Decision:** View Original uses a **local Expo Modules API module** (`modules/oli-secure-pdf-preview` → `OliSecurePdfPreview`) wrapping **Apple PDFKit** (`PDFDocument` + `PDFView`) with Oli-owned modal chrome.

| Approved | Rejected for View Original |
|----------|----------------------------|
| Apple PDFKit via local Expo module | `expo-sharing` / share sheets / AirDrop / Save to Files |
| Custom Close control + dismiss settlement | Quick Look (`QLPreviewController`) as permanent viewer |
| Immediate JS cache cleanup after dismiss | `expo-web-browser` / `Linking` for app-private `file://` PDFs |
| Native path + PDFDocument validation (defense in depth) | `react-native-webview` PDF rendering |
| JS Body Scan cache remains authoritative | Any third-party PDF-viewer dependency |

**Why:** Physical iOS proved `WebBrowser` / `Linking` cannot open app-private cache PDFs. Share sheets are an export surface, not a view-only health-report viewer. Quick Look gives less deterministic control over system share/markup chrome than Oli requires.

**Rebuild required:** New Swift lands in the development client. JS-only OTA does **not** ship the module. Use `npm run ios` / `npx expo run:ios --device` (or EAS `development` with explicit approval). Old binaries return `native_preview_unavailable` (DEV message: rebuild the development client).

**Privacy / App Store (audit notes — not legal closure):** No new usage-description strings; no tracking; no analytics payloads; no network transmission by the viewer; no third-party SDK; no share/export chrome; privacy manifest unchanged (no new Required Reason APIs declared by this module); restricted-API impact none beyond existing app. Do **not** claim **RG-LEGAL-01** / **RG-SOURCE-PRIVACY-01** closed.

**Native XCTest:** The committed `ios/` app has no XCTest target. Path/PDF validation is covered by compile + TypeScript wrapper/harness tests; see `modules/oli-secure-pdf-preview/ios/Tests/NATIVE_TEST_LIMITATION.md`.

**Viewer chrome (B-3E-PDFKIT-CONTRAST-01):** Navigation uses forced dark `overrideUserInterfaceStyle` with UIKit semantic colors (`.secondarySystemBackground` header, `.label` title, `.systemBlue` Close). Close retains VoiceOver label `Close original report` and ≥44pt target. No share/export chrome.

**EXConstants restoration:** Adding the PDFKit module triggered `pod install` while a hoisted `expo-constants@56` (iOS 16.4+) sat at `node_modules/expo-constants`, so CocoaPods dropped `EXConstants` on the iOS 15.1 app. Fix: declare SDK 53–compatible `expo-constants@~17.1.8` as a direct dependency and re-run `pod install`. `OliSecurePdfPreview` remains linked. Do not suppress the runtime warning in JS.

### B-3E-CACHE-01 — original-report cache privacy (fix)

**Status:** Physically CLOSED by independent synthetic iPhone gate (preserve). Real personal PDF remains blocked until later gates.

**Root cause (historical):** Pre-fix `useDocumentOriginalPreview` wrote `cacheDirectory/original-{documentId}.pdf` — not account-scoped, not deleted after preview, and not cleared on logout / account switch / scan delete / account deletion.

**Fix (implemented on this branch):**

| Concern | Behavior |
|---------|----------|
| Cache root | `{cacheDirectory}/body-scans/{opaqueAccountScope}/{documentId}/{previewNonce}.pdf` |
| Account isolation | Opaque scope key derived from UID (raw UID never in path/logs) |
| Per-open path | Unique `previewNonce`; `.partial` then rename to `.pdf` after `%PDF` check |
| Successful dismiss cleanup | PDFKit dismiss settlement (`method=pdfkit`, `deleteImmediately=true`) → delete in JS `finally` |
| Native hold release | Clear `PDFView.document` before resolving dismiss so the file is not held open |
| Stale TTL | `BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS` = **30 minutes**; abandoned `.partial` removed on every sweep |
| Sweep triggers | Before each preview; sign-out / account-switch / account-deletion lifecycle |
| Scan delete | Clears that document’s cache directory after server delete succeeds |
| Offline persistent source | **No** — Stage 3E V1 does not keep originals for offline viewing |

### Synthetic physical cache harness (DEV-only)

- DEV-only route: `/debug/body-scan-cache` (fail-closed outside `__DEV__`).
- Synthetic PDF never leaves the device; no Body Scan API/upload/extraction.
- Harness uses the same cache/preview/cleanup pipeline as production View Original.
- Safe `[BODY_SCAN_CACHE_DEV]` status buckets only (no paths/IDs/UID/URLs).
- Cache harness remains **API-independent** (`GET /users/me/body-scans` 404 is out of scope for this gate).

#### Physical evidence / blockers

##### Historical — CLOSED (pre-foundation runtime)

At earlier Stage 3E viewer SHAs:

- **B-3E-PDFKIT-CONTRAST-01** required a contrast correction for Close / “Original Report” on dark nav chrome.
- **EXConstants** linkage required restoration after PDFKit `pod install` dropped `EXConstants` on the iOS 15.1 app.
- A narrow independent physical retest of contrast + EXConstants was pending.

Subsequently, before the final physically approved foundation runtime:

- contrast passed in Light and Dark Mode;
- EXConstants runtime warning count was zero;
- PDFKit open/close passed;
- cache cleanup remaining/partial zero passed;
- those blockers closed.

| ID | Evidence | Status |
|----|----------|--------|
| **B-3E-PREVIEW-OPEN-01** | PDFKit opens on physical iPhone (scroll/zoom/close/swipe/repeat/double-tap) | **PHYSICALLY CLOSED** (preserve) |
| **B-3E-STALE-HARNESS-01** | Stale PDF + abandoned partial create/inspect/sweep proven physically | **PHYSICALLY CLOSED** (preserve) |
| **B-3E-CACHE-01** | Account/document/sign-out isolation + clear-all + safe DEV logs proven | **PHYSICALLY CLOSED** (preserve) |
| **B-3E-PDFKIT-CONTRAST-01** | Close / “Original Report” contrast on dark nav chrome | **HISTORICAL — CLOSED** before foundation runtime |
| **EXConstants regression** | `No native ExponentConstants module found` after PDFKit pod install | **HISTORICAL — CLOSED** before foundation runtime |

##### Current physical truth

Runtime SHA: `e9397b357642b45eef2a6a40c78217281b375d91`

User-reported physical PASS on that client:

- PDFKit physical path PASS; Close PASS; secure materialization PASS;
- cache cleanup remaining/partial zero;
- no VirtualizedLists warning after the scroll-containment correction;
- no RedBox / crash / request loop;
- Body Scan category-navigation physical gate PASS.

Real personal DXA PDF into Git remains forbidden. **RG-SOURCE-PRIVACY-01** / **RG-LEGAL-01** remain OPEN. No PR / production deploy from the foundation freeze alone.

---

## 8. Export, deletion, audit

`bodyScans`, `bodyScanDrafts`, and `bodyScanFacts` are read into the account export package and removed by account deletion, alongside the stored original under the existing documents storage prefix. Per-scan delete removes storage bytes first, then draft, facts, and record, and is idempotent.

Audit events (`body_scan_created`, `body_scan_extraction_completed`, `body_scan_confirmed`, `body_scan_reprocess_requested`, `body_scan_deleted`) carry counts and a one-way scan token only — never values, filenames, paths, or URLs.

---

## 9. Known limits (accurate as of this stage)

- Upload size is the shared Document Ingestion OS limit of **5 MiB**, not a scan-specific limit. Larger reports are rejected at upload-intent.
- Text-layer extraction only. No OCR, no image upload, no camera capture.
- Only DXA has a structured adapter. Every other scan type is stored and manually reviewed.
- Body Scans are not shown on continuous trend graphs, and there is no cross-method comparison or scale-to-scan calibration.
- No Body score, no Skeletal Muscle Mass estimate, no reference markers or numerical standards (those belong to Stage 3D, which has not begun).

---

## 10. Still open

- Production `bodyScans` flag **disabled**; development enabled.
- **RG-LEGAL-01** and **RG-SOURCE-PRIVACY-01** remain **OPEN**.
- Export coverage / scalability **OPEN**.
- Controlled physical **real** personal DXA PDF into Git remains **forbidden**.
- Stage 3E branch **not merged**; no PR from the foundation freeze alone.
- Assessment Confidence **implementation PASS** at `dc506bbe…` · independent re-gate **PASS** · docs truth-freeze re-gate **PASS** at `d2b0b3abba958c9ac80ec5401f90ad5227a1a0a8` (`docs/00_truth/phase3/BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1_TRUTH_FREEZE.md`); Dual Score scientific correction **PASS** at `6fa8cb22…` (Independent Scientific Re-Gate V2 **PASS**); final mathematical truth freeze **CREATED / PENDING INDEPENDENT REVIEW** (`docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md`); Health / Performance-Supporting score implementation: **STILL BLOCKED** until mathematical freeze re-gate PASS; public numeric scores: **NO-GO**.
- Evidence Resolver: **IMPLEMENTED** (scientific PASS `3ae4737b…`; docs freeze re-gate **PASS** `49751716…`) — see `docs/00_truth/phase3/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1_TRUTH_FREEZE.md` (not implemented in this Body Scans document).

### Closed foundation defects (current truth — not open)

- **B-3E-CACHE-01**, **B-3E-PREVIEW-OPEN-01**, **B-3E-STALE-HARNESS-01**: PHYSICALLY CLOSED (preserve).
- **B-3E-PDFKIT-CONTRAST-01**, **EXConstants** regression: HISTORICAL — CLOSED before foundation runtime.
- **B-BODY-SCAN-SCROLL-CONTAINMENT-01**: PHYSICALLY CLOSED at runtime SHA `e9397b357642b45eef2a6a40c78217281b375d91`.
- PDFKit + cache cleanup remaining/partial zero: user-reported physical PASS at that runtime SHA.
- Staging API `oli-api-00282-45c` @ 100%, Gateway `oli-api-config-20261002-183632`, Firestore index READY: recorded at freeze (not pending deployment for this foundation).

Do **not** claim Stage 3E merged or production-ready.
Do **not** claim the independent source-privacy gate PASS from this document alone.

