# Stage 3E — Waist / Index / Evidence Bridge / Body Scan Foundation Truth Freeze

**Date:** 2026-10-03  
**Branch:** `feat/body-composition-stage3e-body-scans-v1`  
**Kind:** **docs-only truth freeze** (this commit must not change runtime source, tests, API, Gateway, indexes, rules, Functions, native code, schemas, or product behavior)  
**Physical client SHA:** `e9397b357642b45eef2a6a40c78217281b375d91`  
**Physical result:** **PASS**  
**Merge / PR / production:** **NOT** opened or touched by this freeze

> **Rule:** Any later runtime change (`.ts` / `.tsx` / native / API / Functions / schema / OpenAPI / indexes / rules) on this foundation **invalidates** the physical PASS recorded here. A new physical gate is required before re-freezing.

---

## 1. What is frozen

The following foundation surfaces are **truth-frozen** at the physical client SHA above:

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

## 3. Final physical PASS record

Physical client SHA: `e9397b357642b45eef2a6a40c78217281b375d91`

| Check | Result |
|-------|--------|
| Category history scrolls | **PASS** |
| No VirtualizedLists nesting warning (without suppression) | **PASS** |
| Individual scan result scrolls correctly | **PASS** |
| Review measurements scrolls correctly | **PASS** |
| Category pagination (Load More / end-of-history) | **PASS** |
| PDFKit Original report open / close | **PASS** |
| Original-report cache cleanup zero/zero after dismiss | **PASS** |
| No RedBox | **PASS** |
| No crash | **PASS** |
| No request loop | **PASS** |
| Single Metro on 8081 (no second Metro / 8082 fallback) | **PASS** |
| Repository clean and local↔remote aligned at freeze SHA | **PASS** (required at freeze commit + push) |

Defect **B-BODY-SCAN-SCROLL-CONTAINMENT-01**: **PHYSICALLY CLOSED** at this SHA.

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
| **Evidence Resolver** | **AUTHORIZED** as the next implementation phase |
| Assessment Confidence | **STILL BLOCKED** |
| Health Composition score (0–100) | **STILL BLOCKED** |
| Performance Composition score (0–100) | **STILL BLOCKED** |

Authorization means a **new bounded implementation agent** may begin Evidence Resolver work against this frozen foundation SHA (or a docs-only successor), without reopening Waist protocol, deterministic index formulas, Evidence Bridge persistence strategy, Body Scan metric registry keys, category navigation order, filtered cursor pagination, mutation invalidation bus, or scroll-ownership architecture — unless a proven defect requires a bounded correction and a new physical gate.

The Evidence Resolver must **not** silently invent Assessment Confidence or either composition score.

---

## 6. Companion documents

- Progress map: `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
- Roadmap: `docs/10_product/roadmap/ROADMAP_REALITY.md`
- Waist / index: `docs/10_product/specs/STANDARDIZED_WAIST_AND_DETERMINISTIC_INDEX_LAYER_V1.md`
- Evidence Bridge: `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_BRIDGE_V1.md`
- Metric registry: `docs/10_product/specs/BODY_SCAN_CANONICAL_METRIC_REGISTRY_V1.md`
- Body Scans product: `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`
- Body Scans implementation truth: `docs/00_truth/phase3/STAGE_3E_BODY_SCANS_IMPLEMENTATION_TRUTH.md`
