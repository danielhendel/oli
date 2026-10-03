# Stage 3E — Waist / Index / Evidence Bridge / Body Scan Foundation Truth Freeze

**Date:** 2026-10-03
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** **docs-only truth freeze** (must not change runtime source, tests, API, Gateway, indexes, rules, Functions, native code, schemas, or product behavior)
**Merge / PR / production:** **NOT** opened or touched by this freeze

> **Rule:** Any later runtime change (`.ts` / `.tsx` / native / API / Functions / schema / OpenAPI / indexes / rules) on this foundation **invalidates** the physical PASS recorded here. A new physical gate is required before re-freezing.

---

## 0. Immutable SHA identity

### Physically approved runtime SHA

`e9397b357642b45eef2a6a40c78217281b375d91`

Meaning: this is the runtime source that passed the final physical iPhone gate for the Waist / index / Evidence Bridge / Body Scan navigation foundation.

### Initial docs-only foundation freeze SHA

`0fabe4721c311a1a6a8f77a72cc600683e659224`

Meaning: this commit introduced the docs-only foundation freeze. It did not change or rebuild runtime code.

### Docs consistency correction

A subsequent docs-only consistency correction preserves this same runtime and freeze contract. That correction commit is **not** a separately physically tested runtime.

---

## 1. What is frozen

The following foundation surfaces are **truth-frozen** at the physically approved runtime SHA above:

| Surface | Authority / implementation truth |
|---------|----------------------------------|
| Standardized Waist capture | `docs/10_product/specs/STANDARDIZED_WAIST_AND_DETERMINISTIC_INDEX_LAYER_V1.md` |
| Deterministic index layer (BMI / WHtR / FMI / FFMI / ALMI helpers) | same Waist/index spec; pure helpers only |
| Canonical Body Composition Evidence Bridge | `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_BRIDGE_V1.md` |
| Body Scan canonical metric registry | `docs/10_product/specs/BODY_SCAN_CANONICAL_METRIC_REGISTRY_V1.md` |
| Body Scans product/data + category navigation | `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md` |
| Body Scans implementation truth (pagination, cache freshness, scroll ownership, PDFKit/cache) | `docs/00_truth/phase3/STAGE_3E_BODY_SCANS_IMPLEMENTATION_TRUTH.md` |

Frozen product architecture (category-first):

```text
Body Composition
      ↓
Body Scan category (DXA / InBody / Evolt / Bod Pod / Other)
      ↓
Category history (cursor-paginated, newest first)
      ↓
Individual scan result → Review / Original report (PDFKit)
```

Frozen scroll rule: exactly one primary vertical scroll owner per affected screen; category history uses a non-scroll `ModuleScreenShell` + root `FlatList`; warning suppression is prohibited.

---

## 2. Approved staging lineage (read-only record)

Recorded at freeze time. This freeze **does not** deploy or mutate staging.

| Concern | Approved value |
|---------|----------------|
| Cloud Run service | `oli-api` (`oli-staging-fdbba` / `us-central1`) |
| `latestReadyRevisionName` | `oli-api-00282-45c` |
| Default traffic | `oli-api-00282-45c` at **100%** (`latestRevision: true`) |
| Tagged older revisions | Present with tags only (e.g. `oli-api-00229-yaz`); **not** default-serving when `percent` is absent |
| Gateway | `oli-gateway` → `oli-api-config-20261002-183632` (ACTIVE) |
| Firestore index | `bodyScans` — `scanType` ASC + `createdAt` DESC — **READY** |

Do **not** treat `status.traffic[0]` alone as the serving revision. Inspect the full traffic array; only a nonzero `percent` (here 100% on `oli-api-00282-45c`) is default serving traffic.

---

## 3. Evidence record (physical vs automated)

Physical client SHA: `e9397b357642b45eef2a6a40c78217281b375d91`

### A. User-reported physical confirmation on iPhone

The user reported that the requested narrow physical checks passed on the exact client SHA above, including:

| Check | Evidence class | Result |
|-------|----------------|--------|
| Exact physically approved client SHA loaded | User-reported physical | PASS |
| Category-first Body Scan navigation opened | User-reported physical | PASS |
| DXA category history opened and scrolled | User-reported physical | PASS |
| History footer / end state reachable | User-reported physical | PASS |
| No VirtualizedLists nesting warning (without suppression) | User-reported physical | PASS |
| Existing scan result opened and scrolled | User-reported physical | PASS |
| Review measurements (narrow requested check) | User-reported physical | PASS |
| Original report opened in PDFKit | User-reported physical | PASS |
| PDFKit Close | User-reported physical | PASS |
| Cache cleanup remaining/partial zero after dismiss | User-reported physical | PASS |
| No RedBox | User-reported physical | PASS |
| No crash | User-reported physical | PASS |
| No request loop | User-reported physical | PASS |
| Single Metro on 8081 (no second Metro / 8082 fallback) | User-reported physical | PASS |

Stability note: No RedBox, crash, or request loop was reported. A frozen-overlay condition was not separately identified in the final user report. The user reported all requested narrow physical checks passed, including the stability checklist.

Defect **B-BODY-SCAN-SCROLL-CONTAINMENT-01**: **PHYSICALLY CLOSED** at the runtime SHA above (user-reported).

### B. Automated / contract / emulator confirmation

| Check | Evidence class | Result |
|-------|----------------|--------|
| Category-scoped filtering (`scanType`) | Automated / API / emulator | PASS |
| Cursor continuation (`hasMore` / `nextCursor`) | Automated / API / emulator | PASS |
| Filtered pagination matrices (incl. boundary / dedupe / false-empty prevention) | Automated / API / emulator | PASS |
| Mutation invalidation / category cache freshness | Automated | PASS |
| Review field / confirmation contracts | Automated | PASS |
| Scroll-ownership structural tests (non-scroll shell + root FlatList) | Automated | PASS |
| Repository clean / local↔remote alignment at freeze + docs corrections | Git proof | PASS |

Pagination honesty: physical confirmation covers history list scroll, footer/end-state reachability, and absence of the nested-list warning. Complete filtered cursor pagination (including multi-page matrices such as 0/1/49/50/51/100+) is **PASS through governed API/emulator and automated gates**. This freeze does **not** claim “100+ scan pagination physically verified” on a seeded multi-page physical account.

### C. Not exposed / not separately testable here

- Public numeric Health / Performance Composition scores (not implemented)
- Assessment Confidence (not implemented)
- Evidence Resolver ranking / best-current selection (authorized next; not implemented)
- Controlled real personal DXA PDF committed to Git (forbidden)

---

## 4. Explicitly not frozen as “done product”

- Production `bodyScans` flag remains **disabled** until a separate production authorization.
- Branch remains **not merged**; this freeze does **not** open a PR.
- Controlled physical **real personal DXA PDF** into Git remains **forbidden**.
- **RG-LEGAL-01** and **RG-SOURCE-PRIVACY-01** remain **OPEN**.
- Export coverage / scalability gates remain **OPEN**.
- Assessment Confidence remains **not implemented**.
- Health Composition / Performance Composition scores remain **not implemented**.

---

## 5. Next-phase authorization

| Phase | Status |
|-------|--------|
| **Evidence Resolver** | **Implemented / pending independent re-gate** (`body_composition_resolver_draft_v1`; spec `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1.md`) |
| Assessment Confidence | **STILL BLOCKED** pending independent Resolver re-gate |
| Health Composition score (0–100) | **STILL BLOCKED** |
| Performance Composition score (0–100) | **STILL BLOCKED** |

Foundation authorization remains: Resolver work must not reopen Waist protocol, deterministic index formulas, Evidence Bridge persistence strategy, Body Scan metric registry keys, category navigation order, filtered cursor pagination, mutation invalidation bus, or scroll-ownership architecture — unless a proven defect requires a bounded correction and a new physical gate.

The Evidence Resolver must **not** silently invent Assessment Confidence or either composition score.

Phase sequence:

```text
FOUNDATION PHYSICALLY APPROVED (runtime e9397b35…)
        ↓
DOCS TRUTH FREEZE (initial 0fabe472… + docs consistency corrections)
        ↓
EVIDENCE RESOLVER — IMPLEMENTED / PENDING INDEPENDENT RE-GATE
        ↓
ASSESSMENT CONFIDENCE — BLOCKED
        ↓
DRAFT HEALTH/PERFORMANCE SCORE ENGINES — BLOCKED
```

---

## 6. Companion documents

- Progress map: `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
- Roadmap: `docs/10_product/roadmap/ROADMAP_REALITY.md`
- Waist / index: `docs/10_product/specs/STANDARDIZED_WAIST_AND_DETERMINISTIC_INDEX_LAYER_V1.md`
- Evidence Bridge: `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_BRIDGE_V1.md`
- Evidence Resolver: `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1.md`
- Metric registry: `docs/10_product/specs/BODY_SCAN_CANONICAL_METRIC_REGISTRY_V1.md`
- Body Scans product: `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`
- Body Scans implementation truth: `docs/00_truth/phase3/STAGE_3E_BODY_SCANS_IMPLEMENTATION_TRUTH.md`
