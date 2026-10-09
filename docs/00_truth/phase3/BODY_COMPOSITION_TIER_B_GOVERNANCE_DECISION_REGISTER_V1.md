# Body Composition Dual Score — Tier B Governance Decision Register V1

**Document type:** Tier B governance / legal / privacy / ethics decision register (docs only)
**Date:** 2026-10-09
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Records governance-planning gate state. **Does not** authorize Tier B execution, clinical validity, consumer integration, public scores, recruitment, or human-data collection.

| Identity | Value |
|----------|-------|
| Authoritative methodology SHA | `d7714df53af661e4492c67074823902197ced0e7` |
| Governance protocol | `docs/10_product/specs/BODY_COMPOSITION_TIER_B_GOVERNANCE_PRIVACY_ETHICS_PROTOCOL_V1.md` |
| Tier B empirical plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` |
| Parent Tier B decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_DECISION_REGISTER_V1.md` |
| Evidence decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_DECISION_REGISTER_V1.md` |
| Wave 1 truth freeze | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_WAVE1_VALIDATION_TRUTH_FREEZE_V1.md` |

---

## 1. Gate status (authoritative for governance workstream)

| Domain | Status |
|--------|--------|
| Tier B methodology | **PASS** @ `d7714df5…` |
| Governance / legal / privacy / ethics planning | **CURRENT** |
| Governance protocol V1 | **DEFINED (PLANNING)** |
| Governance closure | **NOT COMPLETE** |
| Counsel determinations | **PENDING** |
| Ethics determinations | **PENDING** |
| Security review gate | **PENDING** (design only) |
| Evidence-review workstream | **Separate / CURRENT** (pending independent scientific re-gate) |
| Protocol freeze | **DRAFTING ONLY / WAITING ON DEPENDENCIES** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |
| PHI / human data collection | **NONE** |
| Runtime / production | **UNCHANGED / NOT DEPLOYED** |
| Claim level | **Level 0** |

---

## 2. Planning deliverables

| Deliverable | Status |
|-------------|--------|
| Data-zone model A–E | **DEFINED** |
| `studySubjectId` + linkage model | **DEFINED** |
| Minimum-necessary field categories | **DEFINED** (final field freeze pending protocol) |
| Legal classification decision tree | **DEFINED** · determination **PENDING** |
| HIPAA / non-HIPAA role framework | **DEFINED** · **COUNSEL REQUIRED** |
| State consumer-health review plan | **DEFINED** · **COUNSEL REQUIRED** |
| Consent architecture A–K | **DEFINED** · legal freeze **PENDING** |
| Consent versioning schema (planning) | **DEFINED** · not implemented |
| Withdrawal / revocation matrix | **DEFINED** · outcomes **COUNSEL / ETHICS REQUIRED** |
| Storage security controls (future) | **DEFINED** · not implemented |
| RBAC + dual control | **DEFINED** |
| Audit event classes | **DEFINED** |
| Retention framework | **DEFINED** · durations **NOT FROZEN** |
| Deletion / destruction paths | **DEFINED** |
| Re-identification controls | **DEFINED** · sign-off **PENDING** |
| Small-cell policy | **DEFINED** · threshold N **NOT FROZEN** |
| Sharing categories | **DEFINED** |
| Partner agreement checklist | **DEFINED** · no outreach |
| Incident-response ownership model | **DEFINED** · names **PENDING** |
| Correction + lineage rules | **DEFINED** |
| Dataset release process | **DEFINED** |
| Governance register field freeze | **DEFINED** · **NO ROWS** |
| Hard NO-GO list | **DEFINED** |
| Counsel question register LC-01…12 | **OPEN / BLOCKING** |
| Ethics question register EC-01…08 | **OPEN / BLOCKING** |
| Security review gate checklist | **OPEN** |
| No-PHI-in-git rule | **AFFIRMED** |
| Protocol-freeze input list GF-01…28 | **DEFINED** · all **BLOCKED** or pending until determinations |

---

## 3. Counsel decision register (blocking)

| ID | Blocking status | Disposition |
|----|-----------------|-------------|
| LC-01 Classification | **BLOCKING** | COUNSEL DETERMINATION REQUIRED |
| LC-02 Legal basis | **BLOCKING** | COUNSEL DETERMINATION REQUIRED |
| LC-03 HIPAA role | **BLOCKING** (if US PHI/CE path) | COUNSEL REQUIRED |
| LC-04 State consumer health | **BLOCKING** (if US participants/ops) | COUNSEL REQUIRED |
| LC-05 BAA necessity | Conditional | COUNSEL REQUIRED |
| LC-06 Consent separability | **BLOCKING** | COUNSEL + ethics |
| LC-07 Withdrawal outcomes | **BLOCKING** | COUNSEL + ethics |
| LC-08 Sharing limits | **BLOCKING** before any share | COUNSEL REQUIRED |
| LC-09 Cross-border | Conditional | COUNSEL REQUIRED |
| LC-10 Incident notification | **BLOCKING** before execution | COUNSEL REQUIRED |
| LC-11 Compensation | Conditional | COUNSEL REQUIRED |
| LC-12 Production data linkage | **BLOCKING** if proposed; default forbid | COUNSEL REQUIRED |

---

## 4. Ethics decision register (blocking)

| ID | Blocking status | Disposition |
|----|-----------------|-------------|
| EC-01 HSR | **BLOCKING** | ETHICS DETERMINATION REQUIRED |
| EC-02 IRB / exempt | **BLOCKING** | Do not assume universal IRB |
| EC-03 Burden | **BLOCKING** for human modules | ETHICS DETERMINATION REQUIRED |
| EC-04 Repeated DXA | **BLOCKING** for DXA modules | ETHICS + site safety |
| EC-05 Vulnerable populations | Conditional | ETHICS DETERMINATION REQUIRED |
| EC-06 Compensation | Conditional | ETHICS DETERMINATION REQUIRED |
| EC-07 Withdrawal clarity | **BLOCKING** | ETHICS DETERMINATION REQUIRED |
| EC-08 Comprehension materials | Conditional | Ethics / scientific review |

---

## 5. Protocol-freeze readiness (governance slice)

| Bucket | Items |
|--------|-------|
| **RESOLVED** (planning structure only) | Zone model; identifier model; NO-GO list; register fields; consent class separation; audit/RBAC/dual-control *design*; no-PHI-in-git |
| **NOT_APPLICABLE** | None asserted yet — N/A only after counsel/ethics for specific modules |
| **BLOCKED** (cannot be RESOLVED without external determination or future freeze) | LC-01…12 as applicable; EC-01…08 as applicable; storage approval; encryption class binding; retention durations; small-cell N; re-id sign-off; partner agreements; IR naming; security gate PASS; dataset release owners |

**Rule:** At execution authorization, every GF-01…28 item must be **RESOLVED** or **NOT_APPLICABLE** — never TBD.

---

## 6. Hard NO-GOs (execution remain blocked)

Unresolved legal basis · missing consent · missing ethics determination · unapproved storage · unapproved access · missing auditability · missing retention policy · missing withdrawal handling · unresolved re-identification risk · missing partner agreement (when applicable) · unauthorized export path.

---

## 7. Explicit non-authorizations

This register **does not**:

- close governance
- authorize Tier B execution
- authorize recruitment, site contact, or measurement collection
- create live databases or production security rules
- establish clinical validation
- authorize consumer integration or public scores
- substitute for counsel / IRB / compliance

---

## 8. Roadmap status

```text
Wave 1: COMPLETE / TRUTH-FROZEN (synthetic ACCEPTED)
        ↓
Tier B methodology: PASS @ d7714df5…
        ↓
Evidence review: separate authorized workstream (CURRENT; scientific re-gate PENDING)
Governance/legal/privacy planning: CURRENT (this register)
        ↓
Governance closure: NOT COMPLETE
        ↓
Protocol freeze: DRAFTING ONLY
        ↓
independent protocol re-gate
        ↓
only then: execution authorization
```

| Milestone | Status |
|-----------|--------|
| Tier B methodology | **PASS** |
| Governance planning | **CURRENT** |
| Governance closure | **NOT COMPLETE** |
| Evidence review | **Separate authorized workstream** |
| Protocol freeze | **DRAFTING ONLY** |
| Tier B execution | **NOT AUTHORIZED** |

---

## 9. Next gate

1. Independent governance re-gate against this protocol + register (structure).
2. Engage qualified counsel on LC-01…12 fact package (no recruitment).
3. Engage ethics determination path on EC-01…08 (no execution).
4. Keep evidence scientific re-gate on its own track.
5. Do **not** freeze protocol for execution until GF items close.

**Do not execute Tier B.**
**Do not collect human data.**
**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF TIER B GOVERNANCE DECISION REGISTER V1
