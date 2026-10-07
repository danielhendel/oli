# Body Composition Dual Score — Tier B Decision Register V1

**Document type:** Tier B validation decision register (docs only)
**Date:** 2026-10-07
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Records Tier B planning-gate state. **Does not** authorize Tier B execution, clinical validity, consumer integration, or public scores.

| Identity | Value |
|----------|-------|
| Wave 1 validation truth-freeze SHA | `74c6529b2ec0a8a91d1c8f246144e6cda07ee4b6` |
| Wave 1 execution SHA | `58a09254b1e25c34ada92598fb8cb0ecf1085fff` |
| Validation-plan SHA | `4900f6e56f1eb83799513452cc4b5d2dcc20601d` |
| Approved score implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical Truth Freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Tier B master plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` |
| Wave 1 truth freeze | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_WAVE1_VALIDATION_TRUTH_FREEZE_V1.md` |
| Parent validation decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_VALIDATION_DECISION_REGISTER_V1.md` |

---

## 1. Gate status (authoritative for Tier B)

| Domain | Status |
|--------|--------|
| Wave 1 synthetic robustness evidence | **ACCEPTED** |
| Wave 1 validation truth freeze | **CURRENT** |
| Tier B planning | **CURRENT** |
| Tier B protocol | **NOT FROZEN** |
| Tier B protocol freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Consumer | **NOT AUTHORIZED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| Public | **NO-GO** |
| PHI / real-data collection | **NONE / NOT STARTED** |
| PR / production | **NOT OPENED / UNTOUCHED** |
| Claim level | **Level 0** |

---

## 2. Planning deliverables

| Deliverable | Status |
|-------------|--------|
| Tier B empirical validation master plan | **CREATED** |
| Study catalog TB-01 … TB-18 | **DEFINED** (18 studies) |
| Governance gate checklist | **DEFINED / UNRESOLVED items remain** |
| Privacy architecture contract | **DEFINED / NOT IMPLEMENTED** |
| Cohort / I-E framework | **DEFINED / NOT RECRUITED** |
| Sample-size strategy | **METHOD DEFINED / numeric N NOT FROZEN** |
| Stop/go categories | **DEFINED / numeric thresholds NOT FROZEN** |
| Dataset schema plan | **DEFINED / NO DATASET CREATED** |
| Data governance register template | **DEFINED / NO ROWS** |
| Analysis / pre-registration freeze | **NOT COMPLETE** |
| Independent methodology review | **PENDING** |
| Evidence reviews ER-BC-01…18 closure | **PENDING** |

---

## 3. Study priority rollup

| Class | Meaning | Studies |
|-------|---------|---------|
| **P0** | Protocol freeze required before any Tier B human-data execution; first empirical wave | TB-01, TB-02, TB-05, TB-18 (protocol) |
| **P1** | Required before limited controlled pilot consideration | TB-03, TB-04, TB-06, TB-07, TB-09, TB-12, TB-13, TB-15, TB-16, TB-17, TB-18 empirical |
| **P2** | Required before consumer consideration | TB-08, TB-10, TB-11, TB-14 |
| **P3** | Long-term / prospective extensions | via private-plan BCV-025/026 pathway (not separate TB IDs in V1) |

**Protocol prerequisites** (legal, consent, storage, RBAC, audit, retention, deletion, re-id, etc.) remain distinct from execution priority and **block all execution** until closed.

---

## 4. Governance unresolved blockers (execution)

All of the following remain **UNRESOLVED** → execution **BLOCKED**:

- legal basis
- consent model
- data-use purpose freeze
- minimum necessary data
- approved storage boundary
- encryption standards
- RBAC
- audit logging
- access approval
- retention
- deletion / destruction
- export controls
- breach-response ownership
- re-identification risk review (ER-BC-15)
- small-cell policy
- dataset destruction policy

---

## 5. Explicit non-authorizations

This register **does not**:

- authorize Tier B **execution**
- authorize subject recruitment or clinic contact
- authorize DXA / Waist / PDF collection
- establish clinical validation
- authorize consumer integration or score UI
- authorize public Health or Performance-Supporting scores
- advance claim level beyond Level 0
- freeze numeric acceptance thresholds or sample sizes

---

## 6. Roadmap status

```text
Wave 1: COMPLETE / TRUTH-FROZEN (synthetic ACCEPTED)
        ↓
Tier B planning: CURRENT (THIS REGISTER + master plan)
        ↓
independent methodology review
        ↓
evidence reviews / governance closure
        ↓
Tier B protocol truth freeze
        ↓
independent protocol re-gate
        ↓
only then: execution authorization
```

| Milestone | Status |
|-----------|--------|
| Wave 1 | **COMPLETE / TRUTH-FROZEN** |
| Tier B planning | **CURRENT** |
| Tier B execution | **BLOCKED** |

---

## 7. Next gate

Open a **new independent Tier B methodology reviewer** against the master plan SHA.

**Do not execute Tier B.**
**Do not collect human data.**
**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF TIER B DECISION REGISTER V1
