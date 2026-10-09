# Body Composition Dual Score — Tier B Decision Register V1

**Document type:** Tier B validation decision register (docs only)
**Date:** 2026-10-09
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Records Tier B planning-gate state. **Does not** authorize Tier B execution, clinical validity, consumer integration, or public scores.

| Identity | Value |
|----------|-------|
| Wave 1 validation truth-freeze SHA | `74c6529b2ec0a8a91d1c8f246144e6cda07ee4b6` |
| Wave 1 execution SHA | `58a09254b1e25c34ada92598fb8cb0ecf1085fff` |
| Validation-plan SHA | `4900f6e56f1eb83799513452cc4b5d2dcc20601d` |
| Approved score implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical Truth Freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Prior Tier B plan SHA (methodology FAIL) | `9c5dd88d1e6d3af87a339b608d4ab82351adce1a` |
| Prior methodology re-gate V2 SHA | `942826fc4c2303d53a1a62ab9f8e98458ab86a19` (17/18 closed; TB-06 RTM enrollment remaining) |
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
| Tier B plan methodology | **CORRECTED / PENDING INDEPENDENT METHODOLOGY RE-GATE V3** |
| Evidence-review workstream | **BLOCKED** pending methodology re-gate |
| Governance/legal protocol planning | **BLOCKED** pending methodology re-gate |
| Tier B protocol | **NOT FROZEN** |
| Tier B protocol freeze | **BLOCKED** |
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

## 2. Methodology re-gate history

| SHA | Verdict | Notes |
|-----|---------|-------|
| `9c5dd88d…` | **FAIL** | 18 bounded planning defects |
| `942826fc…` | **FAIL** (narrow) | Re-Gate V2: 17/18 closed; remaining = TB-06 RTM enrollment |
| This correction | Pending V3 | TB-06 RTM enrollment prohibition added; prior 17 remain closed |

---

## 3. Planning deliverables

| Deliverable | Status |
|-------------|--------|
| Tier B empirical validation master plan | **CORRECTED / PENDING RE-GATE V3** |
| Ethics / IRB decision path | **DEFINED / UNRESOLVED determination** |
| Consent taxonomy A–J + withdrawal matrix | **DEFINED / LEGAL REVIEW REQUIRED** |
| Score-specific stop/go (Health vs Performance) | **DEFINED (structure)** |
| Construct-specific stop/go (H1/H2/H3/P1/P3) | **DEFINED (structure)** |
| Change-control path | **FROZEN** |
| Multiplicity planning rules | **DEFINED (method selection at analysis freeze)** |
| Missing-data analysis classes | **DEFINED** |
| Outlier / QC classes | **DEFINED** |
| SP-01 P1 Resolver Policy Review | **OPENED (policy track)** |
| SP-02 Sensitivity / Presentation Policy Review | **OPENED (policy track)** |
| TB-02A/B/C variance separation | **DEFINED** |
| TB-04A–F acute subprotocols | **DEFINED** |
| TB-12A/B · TB-13A/B priority split | **DEFINED** |
| TB-08 pairing/order/delay controls | **DEFINED** |
| TB-06 regression-to-mean controls | **DEFINED** (arm + enrollment; enrollment must not be based solely on extreme baseline dual-score) |
| External dataset gate | **DEFINED** |
| Governance register expanded fields | **DEFINED / NO ROWS** |
| Dataset versioning contract | **DEFINED** |
| Analysis-freeze checklist | **DEFINED** |
| Sample-size methodology table | **DEFINED / numeric N NOT FROZEN** |
| Independent methodology review | **PENDING** |
| Evidence reviews ER-BC-01…18 closure | **BLOCKED** pending methodology re-gate |

---

## 4. Study priority rollup

| Class | Studies / subprotocols |
|-------|------------------------|
| **P0** | TB-01, TB-02A, TB-02B, TB-05, TB-18 protocol |
| **P1** | TB-02C, TB-03, TB-04A–D, TB-06, TB-07, TB-09, TB-12A, TB-13A, TB-15, TB-16, TB-17, TB-18 empirical |
| **P2** | TB-04E–F, TB-08, TB-10, TB-11, TB-12B, TB-13B, TB-14 |
| **P3** | Prospective extensions (BCV-025/026 pathway) |
| Policy | SP-01, SP-02 |

**Rule:** No P1 study may require an unfinished P2 endpoint study (TB-12B/13B depend on TB-10/11).

---

## 5. Governance unresolved blockers (execution)

All remain **UNRESOLVED** → execution **BLOCKED** (and governance/legal planning itself remains blocked until methodology re-gate PASS):

- ethics determination (§3.0 fields)
- legal basis
- consent taxonomy A–J
- withdrawal / revocation model (legal/ethics review)
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

## 6. Explicit non-authorizations

This register **does not**:

- authorize Tier B **execution**
- authorize subject recruitment or clinic contact
- authorize DXA / Waist / PDF collection
- establish clinical validation
- authorize consumer integration or score UI
- authorize public Health or Performance-Supporting scores
- advance claim level beyond Level 0
- freeze numeric acceptance thresholds or sample sizes
- select Resolver winner policy (SP-01 forbids Tier B selection)
- authorize silent formula / threshold / weight tuning

---

## 7. Roadmap status

```text
Wave 1: COMPLETE / TRUTH-FROZEN (synthetic ACCEPTED)
        ↓
Tier B planning: CURRENT
        ↓
methodology correction (TB-06 RTM enrollment) → PENDING INDEPENDENT RE-GATE V3
        ↓
independent methodology re-gate V3 PASS
        ↓
evidence reviews / governance/legal/ethics closure
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
| Tier B plan methodology | **CORRECTED / PENDING RE-GATE V3** |
| Evidence-review workstream | **BLOCKED** |
| Governance/legal protocol planning | **BLOCKED** |
| Tier B execution | **BLOCKED / NOT AUTHORIZED** |

---

## 8. Next gate

Open a **new independent Tier B methodology reviewer (V3)** against the new SHA.

V3 may focus narrowly on the TB-06 RTM enrollment prohibition while confirming the prior **17** blockers remain closed.

Only after **PASS** may evidence-review work and governance/legal protocol planning begin.

**Do not execute Tier B.**
**Do not collect human data.**
**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF TIER B DECISION REGISTER V1
