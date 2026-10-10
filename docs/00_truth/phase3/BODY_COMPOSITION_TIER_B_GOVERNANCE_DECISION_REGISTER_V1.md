# Body Composition Dual Score — Tier B Governance Decision Register V1

**Document type:** Tier B governance / legal / privacy / ethics decision register (docs only)
**Date:** 2026-10-10
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Records governance-planning gate state. **Does not** authorize Tier B execution, clinical validity, consumer integration, public scores, recruitment, or human-data collection.

| Identity | Value |
|----------|-------|
| Authoritative methodology SHA | `d7714df53af661e4492c67074823902197ced0e7` |
| Prior governance protocol SHA (re-gate FAIL) | `8ae2539812d1ba8186d791cff26d4e79b0a47266` |
| Governance protocol | `docs/10_product/specs/BODY_COMPOSITION_TIER_B_GOVERNANCE_PRIVACY_ETHICS_PROTOCOL_V1.md` |
| Tier B empirical plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` |
| Parent Tier B decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_DECISION_REGISTER_V1.md` |
| Evidence decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_DECISION_REGISTER_V1.md` |
| Wave 1 truth freeze | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_WAVE1_VALIDATION_TRUTH_FREEZE_V1.md` |
| Canonical consent taxonomy | **A–J** (methodology-PASS authoritative) |
| Optional future contact | `optionalFutureContactPermission` (non-lettered; outside A–J) |

---

## 1. Gate status (authoritative for governance workstream)

| Domain | Status |
|--------|--------|
| Tier B methodology | **PASS** @ `d7714df5…` |
| Governance / legal / privacy / ethics planning | **CURRENT** |
| Governance protocol V1 | **CORRECTED / PENDING INDEPENDENT GOVERNANCE RE-GATE V2** |
| Governance/legal/privacy closure work | **BLOCKED pending re-gate** |
| Governance closure | **NOT COMPLETE** |
| Counsel determinations | **PENDING** (LC-01…LC-13) |
| Ethics determinations | **PENDING** (EC-01…EC-09) |
| Security review gate | **PENDING** (design only) |
| Evidence-review workstream | **Separate / CURRENT** (pending independent scientific re-gate) |
| Protocol freeze | **NOT COMPLETE / DRAFTING ONLY** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |
| PHI / human data collection | **NONE** |
| Runtime / production | **UNCHANGED / NOT DEPLOYED** |
| Claim level | **Level 0** |

---

## 2. Canonical consent taxonomy A–J

| classId | canonicalName | purpose | separateChoiceRequired | currentStatus | counselOrEthicsOwner | blockingEffect | requiredDecisionArtifact |
|---------|---------------|---------|------------------------|---------------|----------------------|----------------|--------------------------|
| A | `MEASUREMENT_AND_DATA_COLLECTION_CONSENT` | Permission to perform and record governed measurements | Yes where legally/ethically required | **DEFINED / PENDING FREEZE** | Counsel + ethics | Blocks execution if missing when required | Consent package A |
| B | `VALIDATION_AND_RESEARCH_USE_CONSENT` | Use for approved validation/research purpose | Yes | **DEFINED / PENDING FREEZE** | Counsel + ethics | Blocks execution if missing when required | Consent package B |
| C | `PRIVACY_NOTICE_ACKNOWLEDGMENT` | Privacy notice / disclosure acknowledgment (not alone consent where affirmative consent required) | Yes (as notice) | **DEFINED / PENDING FREEZE** | Counsel | Blocks if notice obligations unmet | Privacy notice artifact |
| D | `WITHDRAWAL_FROM_FUTURE_PARTICIPATION` | Stops future participation/collection per approved rules | Yes (mechanism) | **DEFINED / PENDING OUTCOMES** | Counsel + ethics | Blocks if withdrawal path undefined | Withdrawal SOP |
| E | `CONSENT_REVOCATION` | Revokes prior permission; retention of collected/analyzed data per determination | Yes (mechanism) | **DEFINED / PENDING OUTCOMES** | Counsel + ethics | Blocks if revocation path undefined | Revocation SOP |
| F | `SECONDARY_USE_PERMISSION_OR_RESTRICTION` | Authorization/prohibition beyond original purpose | Yes | **DEFINED / DEFAULT FORBID pending freeze** | Counsel | Blocks secondary use without basis | Secondary-use rule |
| G | `PUBLICATION_AND_DATA_SHARING_PERMISSION` | Publication / aggregate / collaborator disclosure rules | Yes where sharing contemplated | **DEFINED / PENDING FREEZE** | Counsel | Blocks sharing without basis | Sharing restrictions |
| H | `EXTERNAL_DATASET_LICENSE_AND_USE_BASIS` | License/lawful basis for non-direct-collected data | N/A if unused | **DEFINED / MAY BE NOT_APPLICABLE** | Counsel | Blocks external-dataset use if unresolved | License / lawful-use memo |
| I | `DATA_CORRECTION_AND_AMENDMENT_REQUEST` | Correction/amendment while preserving lineage | Yes (process) | **DEFINED / PENDING FREEZE** | Counsel + steward | Blocks if rights process required and missing | Correction SOP |
| J | `DELETION_AND_DESTRUCTION_HANDLING` | Deletion, destruction, backup expiration, linkage destruction, certification, retention exceptions | Yes (process) | **DEFINED / PENDING OUTCOMES** | Counsel + ethics | Blocks if deletion/destruction path undefined | Destruction SOP |

### 2.1 Optional Future Contact Permission (outside A–J)

| Field | Value |
|-------|-------|
| Name | `optionalFutureContactPermission` |
| Letter | **None** |
| Purpose | Optional re-contact / future-study outreach, purpose-limited |
| Required for core validation | **No** unless independently justified and approved |
| Separately revocable | Where legally/ethically required |
| currentStatus | **DEFINED AS NON-LETTERED PERMISSION / PENDING FREEZE** |
| counselOrEthicsOwner | Counsel + ethics |
| blockingEffect | Blocks only if future-contact is contemplated without a frozen permission model |
| requiredDecisionArtifact | Permission state/version schema (when implemented) |

### 2.2 Taxonomy reconciliation note

Docs-only reconciliation before execution. No human data or consent records exist → **no migration required**. Future taxonomy revisions must be versioned and migrated explicitly; silent remapping is forbidden. Competing **A–K** taxonomy is **rejected**.

---

## 3. Planning deliverables

| Deliverable | Status |
|-------------|--------|
| Data-zone model A–E | **DEFINED** (preserved) |
| `studySubjectId` + linkage model | **DEFINED** (preserved) |
| Minimum-necessary field categories | **DEFINED** (preserved) |
| Legal classification decision tree | **DEFINED** · determination **PENDING** |
| HIPAA / non-HIPAA role framework | **DEFINED** · **COUNSEL REQUIRED** |
| State consumer-health review plan | **DEFINED** · **COUNSEL REQUIRED** |
| Canonical consent taxonomy A–J | **DEFINED** · legal freeze **PENDING** |
| `optionalFutureContactPermission` | **DEFINED** (non-lettered) · freeze **PENDING** |
| Consent versioning schema (planning) | **DEFINED** · not implemented |
| Withdrawal / revocation matrix | **DEFINED** · outcomes **COUNSEL / ETHICS REQUIRED** |
| Storage security controls (future) | **DEFINED** · not implemented |
| RBAC + dual control (§12) | **DEFINED** |
| Audit event classes | **DEFINED** |
| Retention framework (§14) | **DEFINED** · durations **NOT FROZEN** |
| Deletion / destruction paths | **DEFINED** |
| Re-identification controls | **DEFINED** · sign-off **PENDING** |
| Small-cell + complementary suppression | **DEFINED** · threshold N **NOT FROZEN** |
| Sharing categories | **DEFINED** |
| Partner agreement checklist | **DEFINED** · no outreach |
| Incident-response ownership model | **DEFINED** · names **PENDING** |
| Correction + lineage rules | **DEFINED** |
| Dataset release process | **DEFINED** |
| Governance register field freeze | **DEFINED** · **NO ROWS** |
| Hard NO-GO list (§25) | **DEFINED** |
| Counsel question register LC-01…LC-13 | **OPEN / BLOCKING** |
| Ethics question register EC-01…EC-09 | **OPEN / BLOCKING** |
| Security review gate checklist (§28) | **OPEN** |
| No-PHI / no-linkage-table-in-Git (§29) | **AFFIRMED** |
| Protocol-freeze inputs GF-01…GF-29 | **DEFINED** · pending determinations |

---

## 4. Counsel decision register (blocking)

| ID | Blocking status | Disposition |
|----|-----------------|-------------|
| LC-01 Classification | **BLOCKING** | COUNSEL DETERMINATION REQUIRED |
| LC-02 Legal basis | **BLOCKING** | COUNSEL DETERMINATION REQUIRED |
| LC-03 HIPAA role | **BLOCKING** (if US PHI/CE path) | COUNSEL REQUIRED |
| LC-04 State consumer health | **BLOCKING** (if US participants/ops) | COUNSEL REQUIRED |
| LC-05 BAA necessity | Conditional | COUNSEL REQUIRED |
| LC-06 Consent separability (A–J + optional future contact) | **BLOCKING** | COUNSEL + ethics |
| LC-07 Withdrawal outcomes | **BLOCKING** | COUNSEL + ethics |
| LC-08 Sharing limits | **BLOCKING** before any share | COUNSEL REQUIRED |
| LC-09 Cross-border | Conditional | COUNSEL REQUIRED |
| LC-10 Incident notification | **BLOCKING** before execution | COUNSEL REQUIRED |
| LC-11 Compensation | Conditional | COUNSEL REQUIRED |
| LC-12 Production data linkage | **BLOCKING** if proposed; default forbid | COUNSEL REQUIRED |
| LC-13 Data-subject access / portability / record rights | **BLOCKING** | COUNSEL DETERMINATION REQUIRED |

---

## 5. Ethics decision register (blocking)

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
| EC-09 Acute-state challenge ethics/safety (TB-04A–F) | **BLOCKING** for TB-04 modules | ETHICS DETERMINATION REQUIRED |

---

## 6. Protocol-freeze readiness (governance slice)

| Bucket | Items |
|--------|-------|
| **RESOLVED** (planning structure only) | Zone model; identifier model; NO-GO list (§25); register fields; canonical A–J; optionalFutureContactPermission (structure); audit/RBAC/dual-control *design*; no-PHI/no-linkage-in-Git rule; complementary-suppression *design* |
| **NOT_APPLICABLE** | None asserted yet — N/A only after counsel/ethics for specific modules |
| **BLOCKED** | LC-01…LC-13 as applicable; EC-01…EC-09 as applicable; consent freeze; optional future contact freeze; storage approval; encryption class binding; retention durations; small-cell N + complementary design freeze; re-id sign-off; partner agreements; IR naming; security gate PASS; dataset release owners; Git privacy verification PASS |

**Rule:** At execution authorization, every GF item must be **RESOLVED** or **NOT_APPLICABLE** — never TBD. Small-cell/complementary suppression must be **RESOLVED** or **BLOCKED**. No-PHI/no-linkage-in-Git verification must be **PASS** or **BLOCKED**.

---

## 7. Hard NO-GOs (execution remain blocked)

Unresolved legal basis · missing consent (A–J) · missing ethics determination · unapproved storage · unapproved access · missing auditability · missing retention policy · missing withdrawal handling · unresolved re-identification risk · missing partner agreement (when applicable) · unauthorized export path.

---

## 8. Explicit non-authorizations

This register **does not**:

- close governance
- authorize Tier B execution
- authorize recruitment, site contact, or measurement collection
- create live databases or production security rules
- establish clinical validation
- authorize consumer integration or public scores
- substitute for counsel / IRB / compliance
- claim HIPAA compliance, legal compliance, IRB exemption, security completion, or privacy certification

---

## 9. Roadmap status

```text
Wave 1: COMPLETE / TRUTH-FROZEN (synthetic ACCEPTED)
        ↓
Tier B methodology: PASS @ d7714df5…
        ↓
Evidence review: separate authorized workstream
Governance protocol: CORRECTED / PENDING INDEPENDENT GOVERNANCE RE-GATE V2
Governance/legal/privacy closure work: BLOCKED pending re-gate
        ↓
Governance closure: NOT COMPLETE
        ↓
Protocol freeze: NOT COMPLETE / DRAFTING ONLY
        ↓
only then: execution authorization
```

| Milestone | Status |
|-----------|--------|
| Tier B methodology | **PASS** |
| Governance planning | **CURRENT** |
| Governance protocol | **CORRECTED / PENDING INDEPENDENT GOVERNANCE RE-GATE V2** |
| Closure work | **BLOCKED pending re-gate** |
| Governance closure | **NOT COMPLETE** |
| Protocol freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |

---

## 10. Next gate

Open a **new** independent governance reviewer (Re-Gate V2) against the correction SHA.

Re-Gate V2 focus:

- canonical A–J consent taxonomy
- optional future contact outside the taxonomy
- A–J / A–K consistency (A–K must be absent from present-state wording)
- corrected section references
- LC-13
- EC-09
- complementary suppression
- no linkage tables in Git
- preserved governance architecture
- no legal/ethics/security claim inflation

**Do not execute Tier B.**
**Do not engage counsel against a conflicting schema.**
**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF TIER B GOVERNANCE DECISION REGISTER V1
