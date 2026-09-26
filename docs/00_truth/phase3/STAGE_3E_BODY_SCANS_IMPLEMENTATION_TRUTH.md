# Stage 3E — Body Scans Foundation V1: Implementation Truth

**Status:** implemented on `feat/body-composition-stage3e-body-scans-v1`; **not merged**; production `bodyScans` flag **disabled**.

**Authority:** subordinate to `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`. This document records what the code actually does, not what is planned.

**Base:** `5835051715ceea5e1a1cece12f28a9af53e206e7` (Stage 3C merge), docs-only commit `6c17349e`.

---

## 1. What a user can do

Upload a scan report (PDF) from Body Composition → Body Scans, review the values the adapter read, correct anything that differs, save them, open the original report, re-read the report, and delete the scan. Nothing is recorded until the user explicitly confirms it.

Routes: `/(app)/body/scans`, `/(app)/body/scans/new`, `/(app)/body/scans/[scanId]`, `/(app)/body/scans/[scanId]/review`, `/(app)/body/scans/[scanId]/report`. The former `/(app)/body/dexa` and `/(app)/scans` placeholders now redirect into this experience.

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

### B-3E-CACHE-01 — original-report cache privacy (fix)

**Blocker:** Independent Stage 3E gate STOP. Real-PDF testing remains prohibited until this fix is independently re-reviewed.

**Root cause:** Pre-fix `useDocumentOriginalPreview` wrote `cacheDirectory/original-{documentId}.pdf` — not account-scoped, not deleted after preview, and not cleared on logout / account switch / scan delete / account deletion. `cleanupExportArchiveFiles` only covered export zip/bin artifacts.

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

Physical-device proof was blocked by three gaps: no safe synthetic PDF for iOS `View Original`, cleanup status only asserted in unit tests, and LOCAL_DEV does not support Firebase emulators / local mobile APIs.

**Bounded solution (this branch):**

- DEV-only route: `/debug/body-scan-cache` (also linked from Debug index + Settings Dev rows; fail-closed with `Redirect` when `__DEV__` is false).
- Synthetic PDF bytes generated in-process (`syntheticBodyScanCachePdf.ts`) — approved non-health text only; never leaves the device; no Body Scan API/upload/extraction. Parser-validated via pdfjs (one page, approved text only).
- Harness writes through the same `.partial` → verify → `.pdf` → **PDFKit preview** → cleanup pipeline as production (`materializeBodyScanOriginalFromBytes` + `openDocumentOriginal` + `openBodyScanOriginalLocalPreview`).
- Successful physical close emits `[BODY_SCAN_CACHE_DEV]` `preview_close_cleanup` / `ok` / `previewMethod=pdfkit` / remaining+partial buckets `zero` (no paths/IDs/UID/URLs).
- Stale sweep accepts optional `nowMs` (DEV harness advances the comparison clock; production default remains `Date.now()`).
- Existing development Auth may be used for sign-out / account-switch; that is **not** a staging Body Scan deployment.
- LOCAL_DEV architecture unchanged; no emulators added.
- Cache harness remains **API-independent**. A configured backend `GET /users/me/body-scans` **404** does not block this local viewer/cache gate; full real-PDF Body Scan E2E still requires a controlled Stage 3E staging deployment/security gate later. Do not conflate the two.

#### Physical evidence / blockers

| ID | Evidence | Status |
|----|----------|--------|
| **B-3E-PREVIEW-OPEN-01** | Code path now PDFKit; physical iPhone display still requires **rebuilt** development client + independent retest | **CODE CLOSED / PHYSICAL RETEST REQUIRED** |
| **B-3E-STALE-HARNESS-01** | Fixture create verifies existence; sweep fails on zero removed / missing fixtures | **CODE CLOSED / PHYSICAL RETEST REQUIRED** |
| **B-3E-CACHE-01** | Physical cache lifecycle gate | **PHYSICAL RETEST REQUIRED** (do not mark physically closed from this agent) |

**Still open:** Independent synthetic physical-iPhone re-gate against the new SHA + rebuilt client. Real personal PDF remains blocked. **RG-SOURCE-PRIVACY-01** / **RG-LEGAL-01** remain OPEN. Do not mark physical check PASS from the implementation agent. No backend deployment in this pass. No PR from this pass.

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
- **B-3E-CACHE-01** implementation fix landed; DEV synthetic harness landed; PDFKit viewer landed; **physical retest required** on rebuilt development client.
- **B-3E-PREVIEW-OPEN-01** code path closed (PDFKit); **physical iPhone retest required** after rebuild.
- **B-3E-STALE-HARNESS-01** code closed; physical retest required.
- Controlled physical **real** DXA PDF test remains **blocked** until synthetic cache gate + independent re-gate PASS; the personal PDF must never enter Git.
- Full real-PDF E2E also requires Stage 3E staging API deployment (separate from the API-independent viewer/cache gate; `/users/me/body-scans` 404 on the currently configured backend is out of scope for the viewer gate).
- Independent Stage 3E architecture / security / staging gate **required**.
- No staging or production deployment from this work.

Do **not** claim Stage 3E merged or production-ready.
Do **not** claim the independent source-privacy gate PASS from this document alone.
Do **not** claim the physical check PASS from this document alone.

