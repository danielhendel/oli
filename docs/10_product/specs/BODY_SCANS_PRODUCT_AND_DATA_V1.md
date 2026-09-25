# Body Scans Product and Data Specification v1

**Status:** Stage 3E ACTIVE (foundation implementation in progress)
**Date:** 2026-09-25
**User-facing name:** Body Scans
**Internal terms:** Body Composition Assessment / Body Scan
**Authority level:** T2 product authority (subordinate to Constitution and code/CI)
**Companions:**
- Body Composition product/standards: `docs/10_product/specs/BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md`
- Document Ingestion OS: `docs/00_truth/phase3/PHASE_3C_DOCUMENT_INGESTION_OS.md`
- Progress map: `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
- Roadmap: `docs/10_product/roadmap/ROADMAP_REALITY.md`
- System state: `docs/20_architecture/SYSTEM_STATE.md`

**Governing ingestion architecture:** Document Ingestion OS (`PHASE_3C_DOCUMENT_INGESTION_OS.md`) remains binding. Stage 3E extends that OS for the `scans` domain; a separate ADR is **not** required unless a future change breaks Model A private storage, owner-only Admin SDK writes, or the governed ingest front door.

---

## 1. Product principle

```text
Designed results are the experience.
The original report is the evidence.
```

Body Scans is the unified place for **periodic** body-composition assessments (DXA/DEXA, InBody, Evolt, Bod Pod, and other reports). Continuous tracking remains on Body Composition cards (Weight, Body Fat, Lean Mass).

---

## 2. Continuous tracking vs periodic assessment

| Surface | Role |
|---------|------|
| Weight / Body Fat / Lean Mass cards | Ongoing connected-scale / Apple Health tracking |
| Body Scans | Periodic assessment reports with designed results + original PDF |

**Hard rules:**

- Do **not** overwrite today’s Weight, Body Fat, or Lean Mass cards with an older scan.
- Do **not** mix Body Scan metrics into connected-scale trend lines.
- Do **not** calculate Scale → DXA or DXA → Scale change.
- Do **not** treat DXA, InBody, and Evolt as interchangeable.
- Do **not** silently fall back to a scan when regular tracking is missing.
- Do **not** insert scan values into Weight / Body Fat / Lean Mass Low / High / Change.

---

## 3. Scan types (V1)

| User-facing | Internal `scanType` | Method (typical) |
|-------------|---------------------|------------------|
| DXA | `dxa` | `dxa` |
| InBody | `inbody` | `bia` |
| Evolt | `evolt` | `bia` |
| Bod Pod | `bod_pod` | `air_displacement` |
| Other | `other` | `other` |

V1 automated structured extraction adapter: **Live Lean Rx / GE Lunar-style DXA** only.

For InBody / Evolt / Bod Pod / Other:

- accept and securely store the PDF;
- detect type where possible; allow correction;
- extract only when a validated adapter exists;
- otherwise **Needs Review** with manual canonical fields;
- preserve vendor-specific fields;
- never fabricate unsupported fields.

---

## 4. Supported V1 capabilities

1. Body Scans section on Body Composition (after Components)
2. Body Scans list (newest first)
3. Add Scan PDF flow (PDF only)
4. Private original PDF storage (Document OS Model A)
5. Asynchronous / app-close-safe processing (poll status; do not block UI on extraction)
6. Scan-type detection and correction
7. DXA automated extraction adapter (Live Lean / GE Lunar)
8. Review-and-confirm flow
9. Designed Body Scan detail page
10. Secure View Original Report (short-lived authenticated access; no public URLs)
11. Generic / manual review for unsupported reports
12. Reprocess
13. Delete (designed results + extracted data + original report + governed linked records)
14. Export coverage
15. Account-deletion coverage
16. Audit logging (safe; no PHI in operational logs)
17. Accessibility (Dynamic Type, VoiceOver, 44-pt targets)
18. Loading / empty / error / offline states
19. Feature flag `bodyScans` (dev enabled; production disabled)
20. Account isolation and rules tests

---

## 5. Statuses

```text
uploading → processing → needs_review | failed → verified
failed | needs_review → processing (reprocess)
verified → needs_review only via governed correction/reprocess
any owned non-deleted → deleting → deleted/tombstoned
```

Consumer copy:

| Status | Copy |
|--------|------|
| Uploading | Uploading report… |
| Processing | Reading your Body Scan… |
| Needs Review | Review the extracted results before saving. |
| Verified | Results available. |
| Failed | We couldn’t read this report. |

Client must **not** mark itself verified by mutating storage/database directly.

---

## 6. Extraction → review → confirm

1. Client creates authenticated scan draft / upload intent.
2. Server coordinates private upload; client uploads PDF.
3. Server validates (MIME, PDF magic bytes, size, hash) and finalizes.
4. Processing job runs text extraction + adapter registry.
5. Adapter produces an **extraction draft** (not trusted truth).
6. Status → Needs Review or Failed.
7. User reviews / corrects; explicit confirm required.
8. Confirmation creates governed normalized scan facts/events (distinct from continuous scale measurements).
9. Status → Verified.

Low-confidence fields require review. Missing values remain missing (never coerced to zero). Auto-confirm of low-confidence extraction is forbidden.

---

## 7. Method / provenance / comparability

Every confirmed metric preserves:

- scan ID and source document ID;
- measurement method;
- device manufacturer/model when known;
- adapter ID/version;
- source page / raw label when available;
- **comparability group** (e.g. `dxa:ge-lunar:body-fat-percent`).

Stage 3E V1 stores comparability data but **does not** expose scan-to-scan Change UI.

---

## 8. Designed results + original report

- Designed detail sections: Overview, Fat Distribution, Regional Composition, Regional Lean Balance, Total Body Bone, Source.
- Original PDF remains immutable evidence; never discarded after extraction.
- View Original uses short-lived authenticated access; never permanent public URLs or raw Storage paths in the client UI.

---

## 9. Scientific / labeling posture

- Lean Mass is **not** Skeletal Muscle Mass.
- DXA Lean Mass is not direct measured muscle; regional Lean Mass is not direct muscle mass.
- BIA and DXA are not interchangeable.
- Total-body BMD is not a diagnostic hip/spine osteoporosis exam; use restrained source context.
- Vendor Ideal / High / Very High bands are source-reported only — **not** Oli health truth in V1.
- No Body score; no diagnosis; no Optimal / Excellence; no muscle-mass estimates in this stage.

---

## 10. Security / privacy

- Authenticated owner-only upload / read / delete.
- No public ACL; platform encryption in transit and at rest.
- SHA-256 content hash; duplicate detection per user+hash.
- PDF signature + MIME validation; centralized size limit (Document OS bridge limit unless superseded).
- No Firebase / Firestore / Storage in screens.
- Operational logs must not include patient name, DOB, PDF text, metric values, signed URLs, tokens, or Storage paths.
- Real personal health PDFs must **never** enter Git or fixtures; use de-identified synthetic fixtures only.
- Sensitive-document disclosure: reuse approved copy when present; otherwise development-only non-final copy with production flag off and a release blocker.
- **Original-report local cache (B-3E-CACHE-01):** temporary app-private files only under an account-scoped `body-scans/` cache root; deleted after dismiss-style preview when the platform API supports it; otherwise removed by stale sweep (30 minutes) and by logout / account-switch / scan-delete / account-deletion. No persistent offline original storage in V1.

---

## 11. Export / delete

Export must include Body Scan metadata, normalized metrics, regions, method/device, comparability groups, extraction/review provenance, corrections, and original report (or governed document-export manifest).

Delete and account deletion must remove scan records, drafts, normalized scan events, source documents, temporary uploads, cached signed access, and local cached documents — idempotent, no orphans.

---

## 12. Feature flag

| Flag | `bodyScans` |
|------|-------------|
| Development | enabled |
| Staging | optional after independent approval |
| Production | **disabled** until privacy/legal copy approved, source-privacy gate closed, export/delete verified, security/rules review passed, staging physical test passed, and final merge/deploy gate approved |

API remains authorization-protected regardless of flag.

---

## 13. Release blockers (remain open)

- **RG-LEGAL-01 OPEN** (hosted Privacy / Terms / Support)
- **RG-SOURCE-PRIVACY-01 OPEN**
- Export coverage / scalability **OPEN**
- Production sensitive-document legal copy approval (if not already approved)
- Controlled physical real-PDF test (not committed to Git)
- Independent Stage 3E architecture / security / staging gate

No staging or production deployment from the Stage 3E implementation agent.

---

## 14. Explicitly out of scope (deferred)

- Camera / photo / image-gallery upload
- New OCR vendor
- Direct DXA / InBody / Evolt provider APIs
- Automated InBody / Evolt / Bod Pod adapters (beyond store + manual review)
- Scan markers on regular Weight / Body Fat / Lean Mass graphs
- Scale-to-scan calibration or change
- Cross-method scan change UI
- Skeletal Muscle Mass estimate / Muscle Mass replacement
- Body score; AI recommendations from scan values
- Professional sharing UI beyond existing permissions
- Production rollout

---

## 15. Stage relationships

| Stage | Status (as of Stage 3E docs start) |
|-------|-------------------------------------|
| Stage 3C | **MERGED** (PR #221; merge commit `5835051715ceea5e1a1cece12f28a9af53e206e7`; post-merge proof **PASS**) |
| Stage 3D | **NOT BEGUN / DEFERRED** (Body Facts and Measurement Provenance — not required to begin 3E) |
| Stage 3E | **ACTIVE** (this foundation) — implemented on branch, **not merged** |

Do **not** claim Stage 3E merged or production-ready from this specification alone.

---

## 16. Implementation record

What the code actually does, including the reuse inventory, enforced boundaries, and known limits (5 MiB shared upload limit; text-layer extraction only; DXA is the only structured adapter), is recorded in `docs/00_truth/phase3/STAGE_3E_BODY_SCANS_IMPLEMENTATION_TRUTH.md`. Where this specification and that record disagree, the record describes the branch and this specification describes the intent.
