# Body Composition Dual Score — Tier B Governance / Privacy / Ethics Protocol V1

**Document type:** Tier B governance, privacy, consent, security, legal-review, and ethics-determination **planning protocol** (docs only)
**Date:** 2026-10-09
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. **Does not** authorize Tier B execution, recruit subjects, collect human data, create live databases, implement production security rules, contact sites, ingest PHI, or deploy.

| Identity | Value |
|----------|-------|
| Authoritative methodology SHA | `d7714df53af661e4492c67074823902197ced0e7` |
| Tier B methodology | **PASS** |
| Tier B empirical plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` |
| Tier B decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_DECISION_REGISTER_V1.md` |
| Companion governance decision register | `docs/00_truth/phase3/BODY_COMPOSITION_TIER_B_GOVERNANCE_DECISION_REGISTER_V1.md` |
| Wave 1 truth freeze | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_WAVE1_VALIDATION_TRUTH_FREEZE_V1.md` |
| Evidence review (separate workstream) | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_REVIEW_V1.md` |
| Consumer consent ADR | `docs/70_adrs/ADR-consumer-consent-architecture-v1.md` |
| Consumer consent RFC | `docs/80_rfc/RFC-consumer-consent-persistence-v1.md` |
| Account deletion ADR | `docs/70_adrs/ADR-account-deletion-lifecycle-v1.md` |
| Body Scans product/data | `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md` |
| Plan status | **PLANNING** |
| Governance planning | **CURRENT** |
| Governance closure | **NOT COMPLETE** |
| Execution | **NOT AUTHORIZED** |

> **This document designs fail-closed requirements and decision paths.**
> It does **NOT** substitute for qualified legal counsel, an IRB, an ethics board, institutional compliance review, or required regulatory determination.
> Where applicability depends on Oli’s future role, data flow, sponsor, site, jurisdiction, or contract: **COUNSEL DETERMINATION REQUIRED**.
> Human data: **NONE**. Runtime changes: **NONE**.

---

## 0. Mission and hard boundaries

### 0.1 Mission

Define the governance, privacy, consent, security, legal-review, and ethics-determination protocol that **MUST** be closed before Oli may execute Tier B empirical validation using human-derived data.

### 0.2 Hard boundaries (non-negotiable for this planning phase)

**DO NOT:**

- ingest participant data
- inspect production data
- upload PHI
- recruit or contact participants
- contact study sites
- collect DXA or Waist
- create live databases
- create production security rules
- execute a study
- authorize study execution
- deploy

### 0.3 Authority relationship

```text
Mathematical / Engine / Resolver / Confidence Truth Freezes
  → Wave 1 Validation Truth Freeze (synthetic ACCEPTED)
  → Tier B Empirical Validation Plan (methodology PASS @ d7714df5…)
  → THIS Governance / Privacy / Ethics Protocol (planning only)
  → future counsel / ethics / security determinations
  → future Tier B Protocol Truth Freeze
  → future explicit Tier B Execution Authorization
```

Consumer product security boundaries (Document OS Model A private storage, owner-only Admin SDK writes, no public ACL, export/delete architecture, consent-event architecture) remain preserved unless a future documented requirement changes them through normal RFC/ADR governance. **This protocol does not reopen consumer production paths for Tier B human data.**

### 0.4 Fail-closed rule

Future Tier B human-data execution **must fail closed** if any hard NO-GO in §28 is unresolved. Ambiguous “TBD” is **not** an acceptable protocol-freeze state for execution-blocking items.

---

## 1. Data-flow model (conceptual zones)

### 1.1 Zones

| Zone | Name | Contents (conceptual) | Default access |
|------|------|-----------------------|----------------|
| **A** | Identity / contact | Legal name, email, phone, address, logistics, account UID if any, signed consent artifacts with identity | Study coordinator + data steward only; audited |
| **B** | Linkage / token table | Mapping between Zone A identity keys and `studySubjectId`; no measurement payloads | Data steward + dual-control break-glass; audited |
| **C** | Pseudonymous raw validation measurements | `studySubjectId`, measurements, provenance, QC flags, protocol versions — **no identity** | Measurement operator (write limited), data steward, analyst (read) |
| **D** | Derived analysis dataset | Indices, offline score outputs, analysis-ready joins — **no identity** | Analyst + scientific reviewer (read); steward controls release |
| **E** | Aggregate outputs | Cell-suppressed tables, figures, reports suitable for internal review / approved publication | Broader internal scientific review under export controls |

### 1.2 Allowed flows

```text
A ──(create/update subject)──► B ──(issue studySubjectId)──► C
C ──(governed derive)──► D ──(approved aggregate)──► E

Forbidden by default:
A → C, A → D, A → E          (identity must not enter analysis/aggregate stores)
C → A, D → A                 (no reverse identity write from analysis)
B → D / B → E                (linkage keys must not ride into analysis exports)
E → C / E → D                (aggregates do not rehydrate row-level data)
```

**Identity MUST NOT be present in the standard analysis dataset (Zone D).**

### 1.3 Boundary with consumer production

| Rule | Status |
|------|--------|
| Tier B validation stores are **outside** consumer production Firestore/Storage product paths | **REQUIRED** (future implementation) |
| Production consumer data may not be reused without separate lawful basis + register row | **HARD** |
| No PHI / participant data / real DXA PDFs / exported datasets in git | **HARD** (§32) |

---

## 2. Subject identifier model

### 2.1 `studySubjectId`

| Requirement | Rule |
|-------------|------|
| Form | Random / non-semantic opaque identifier |
| Not Firebase UID | **FORBIDDEN** as analysis key |
| Not email-derived | **FORBIDDEN** |
| Not DOB-derived | **FORBIDDEN** |
| Reversibility | Not reversible without Zone B linkage store |
| Stability | Stable for a subject within a dataset version unless re-issuance is dual-controlled and audited |

### 2.2 Linkage store (Zone B)

| Control | Requirement |
|---------|-------------|
| Separation | Separate system/project/collection from Zones C–E |
| Access | Restricted to named roles; no analyst standing access |
| Audit | Every view/export/join attempt logged |
| Dual control | Break-glass / bulk linkage access requires dual approval (§15) |

---

## 3. Minimum necessary data

### 3.1 Necessity categories

| Category | Meaning |
|----------|---------|
| **REQUIRED** | Needed for frozen Tier B scientific purpose; collect if module runs |
| **CONDITIONALLY_REQUIRED** | Required only for named modules / strata / safety screens |
| **EXPLORATORY** | Optional; may be collected only with separate justification + consent scope |
| **PROHIBITED** | Must not enter Tier B stores / analysis unless counsel + ethics explicitly authorize a narrow exception |

### 3.2 Field-by-field planning matrix

| Field / class | Category | Preference / notes |
|---------------|----------|--------------------|
| `studySubjectId` | REQUIRED | Zone C/D only |
| Governed reference sex | REQUIRED | Per frozen score policy |
| Age band / completed years (minimized) | REQUIRED | Prefer band or completed years over exact DOB |
| Exact DOB | **PROHIBITED** in Zone D; **CONDITIONALLY_REQUIRED** in Zone A only if age verification / safety needs it | Prefer derived age at enrollment |
| Height | REQUIRED (modules using indices) | Shared provenance |
| Waist (WHO midpoint) | REQUIRED for TB-01 / H1 path modules | Protocol version pinned |
| DXA FM / FFM / ALM | REQUIRED for DXA modules | Vendor/model/software provenance |
| Vendor / model / softwareVersion | REQUIRED for DXA confirmatory uses | Pseudonymize machine |
| `siteId` (coded) | REQUIRED for multi-site | Pseudonym |
| `machineId` (pseudonym) | REQUIRED for same/cross-machine | Not serial in public exports |
| `operatorCategory` | REQUIRED where operator variance studied | Not personal name in Zone D |
| Athletic status label | CONDITIONALLY_REQUIRED (TB-09/11/fairness) | Independent of score cuts |
| Menopause status | CONDITIONALLY_REQUIRED / EXPLORATORY | Ethics + necessity review |
| Access pathway / scorability meta | CONDITIONALLY_REQUIRED (TB-15) | Minimize free text |
| Exact measurement timestamps | Prefer study-day / time-of-day category | Full timestamps only if scientifically required |
| Exact calendar dates of visits | Prefer study-day offsets | Date minimization (§19) |
| ZIP / postal code | **PROHIBITED** in Zone D; Zone A only if logistics require | Prefer region band if any geography needed |
| Street address | **PROHIBITED** in Zones C–E; Zone A logistics only | Delete when logistics complete if lawful |
| Free-text medical notes | **PROHIBITED** by default | Structured codes only |
| Full clinical documents / identifiable DXA PDFs | **PROHIBITED** in Zone D/E; Zone C only if dual-controlled raw vault justified | Prefer extracted numeric metrics |
| Email / phone / name | Zone A only | Never Zone D |
| Firebase UID / production paths | **PROHIBITED** in Zone D | Link only via Zone B if ever needed |
| External outcome labs (TB-10/11) | CONDITIONALLY_REQUIRED | Assay/method provenance; minimize identifiers |
| Compensation records | Zone A / finance separate | Not in analysis store |

**Prefer derived/minimized fields wherever scientifically sufficient.**

---

## 4. Legal classification decision tree

### 4.1 Pre-execution tree (planning)

```text
START: Proposed Tier B human-data activity
  │
  ├─ Is activity limited to non-human / synthetic / already-authorized Wave 1?
  │    YES → not this protocol’s human-data path
  │
  ├─ External secondary dataset only (no Oli interaction)?
  │    YES → External secondary dataset path (§4.2 + Tier B plan §16B)
  │         → lawful-use / license determination
  │         → COUNSEL DETERMINATION REQUIRED
  │
  ├─ Does activity involve living individuals via interaction, intervention,
  │  or identifiable private information for research/validation?
  │    UNKNOWN → COUNSEL / ETHICS DETERMINATION REQUIRED (do not self-label)
  │    NO → document non-HSR rationale via authorized party; still require
  │         privacy/security/consent-as-applicable review
  │    YES → Human-subject research path
  │
  ├─ Product research vs quality improvement vs research label?
  │    → Document intended framing
  │    → Authorized party determines whether framing changes obligations
  │    → QI / product labels are NOT self-escape hatches
  │
  ├─ If research under governing rules: exempt vs non-exempt?
  │    → Document category or full review path
  │    → Do NOT assume IRB is universally required
  │    → Do NOT assume IRB is never required
  │
  └─ REQUIRED OUTCOME: written determination by appropriate authorized party
       fields in ethicsDetermination* + legalBasis (governance register)
```

### 4.2 External secondary dataset analysis

Require license/terms, lawful-use basis, permitted purpose covering dual-score validation, method provenance, cohort definition, sharing restrictions — per Tier B plan §16B. Confirmatory use blocked if method provenance insufficient.

### 4.3 Required determination artifact

| Output | Required |
|--------|----------|
| Classification label(s) | Yes |
| IRB/ethics required? | Yes |
| Exemption category or `n/a` | Yes |
| Authority / reviewer | Yes |
| Date + reference ID | Yes |
| Approval status | Yes |

**COUNSEL DETERMINATION REQUIRED** for final legal classification where jurisdiction/role is unsettled.

---

## 5. HIPAA / non-HIPAA role analysis

### 5.1 Decision framework (not a compliance claim)

Do **not** label Oli “HIPAA compliant.” Applicability depends on role and data flow.

| Question | Possible outcomes (examples) | Notes |
|----------|------------------------------|-------|
| Is a party a HIPAA covered entity (CE)? | CE / not CE | Clinic, health system, provider site |
| Is Oli (or vendor) a business associate of a CE for this flow? | BA / not BA / hybrid | Depends on services + PHI create/receive/maintain/transmit for CE |
| Is data consumer health data outside HIPAA? | Non-HIPAA consumer health | State laws may still apply (§6) |
| Are records research records under a specific IRB/protocol? | Research records | May interact with HIPAA authorizations / waivers |
| Hybrid relationships? | Split environments | Consumer app vs validation store must not be conflated |

### 5.2 Fact package counsel needs

- Exact Oli role (sponsor, processor, platform, collaborator)
- Whether sites are CEs
- Whether PHI is created/received
- Whether BAA is proposed
- Data residency and subprocessors
- Whether consumer Firebase UID/data is touched

### 5.3 Final determination

**COUNSEL REQUIRED.** This protocol only freezes the decision framework and required documentation fields.

---

## 6. State consumer health data laws

### 6.1 Review triggers

Legal review must consider applicable state consumer-health-data laws based on:

| Factor | Why |
|--------|-----|
| Participant residence | Many statutes are residence-triggered |
| Company operations / targeting | Entity nexus |
| Type of health data | Body composition, DXA, waist, biometrics |
| Consent / authorization model | Collection vs sharing vs sale definitions |
| Sharing / sale definitions | Collaborator DUA, publication, vendors |
| Sensitive data definitions | May be broader than HIPAA PHI |

### 6.2 Planning requirement

Produce a jurisdiction matrix before execution authorization listing candidate laws, applicability hypothesis, and counsel disposition. **Do not claim a final jurisdictional conclusion without counsel review.**

**COUNSEL DETERMINATION REQUIRED.**

---

## 7. Consent architecture

### 7.1 Separation principle

Align with consumer consent ADR/RFC event model (append-only, versioned, non-bundled categories) while recognizing Tier B research/validation consents are a **separate** domain from consumer `legal_terms` / `legal_privacy` product assent (RG-LEGAL-01 remains a distinct consumer gate).

**No bundled consent merely for convenience** if separate choice is legally or ethically required.

### 7.2 Consent / notice classes (extend Tier B plan A–J)

| Class | Name | Must remain separable |
|-------|------|------------------------|
| **A** | Measurement / data-collection consent | Waist/DXA/labs/function measures |
| **B** | Validation / research-use consent | Dual-score Tier B analyses |
| **C** | Privacy notice acknowledgment | Notice of processing / rights |
| **D** | Optional future contact | Re-contact / future studies — opt-in |
| **E** | Secondary use | Any use beyond Tier B validation purpose |
| **F** | Publication / sharing | External reporting / dataset sharing |
| **G** | Withdrawal from future participation | Stops future contact/measures |
| **H** | Revocation of processing permissions | Distinct recording from G |
| **I** | Correction / amendment requests | How subjects request correction |
| **J** | Destruction / deletion after withdrawal | Interaction with G/H |
| **K** | External-dataset license / use basis | Non-participant; Tier C-style |

Consumer product research category in RFC (`research`) must never be implied by Terms/Privacy alone — same principle applies here.

---

## 8. Consent versioning (schema planning only)

Every future consent event must support:

| Field | Purpose |
|-------|---------|
| `consentVersion` | Artifact / document version |
| `timestamp` | Server-authored event time |
| `purpose` | Bound purpose string(s) |
| `permissions` | Granted processing permissions |
| `restrictions` | Explicit limits |
| `withdrawalStatus` | Current withdrawal/revocation projection |
| `supersededVersion` / prior event link | Supersession without silent overwrite |

Events are append-oriented. **Do not** silently overwrite research provenance or consent history. No persistence implementation in this phase.

---

## 9. Withdrawal / revocation matrix

Exact retention outcomes: **COUNSEL / ETHICS DETERMINATION REQUIRED.**

| Timing | Future collection | Identifiable (Zone A) | Linkage (Zone B) | Pseudonymous raw (Zone C) | Derived (Zone D) | Aggregate (Zone E) |
|--------|-------------------|-----------------------|------------------|---------------------------|------------------|--------------------|
| Before measurement | Stop | Delete/minimize per policy | Delete if created | n/a | n/a | n/a |
| After measurement / before analysis | Stop | Per counsel/ethics | Per counsel/ethics | Delete if permitted | None yet | n/a |
| After analysis | Stop | Per counsel/ethics | Per counsel/ethics | Per counsel/ethics | Row-level per counsel/ethics | Aggregates only if lawfully retainable |
| After aggregate reporting | Stop | Per counsel/ethics | Per counsel/ethics | Per counsel/ethics | Per counsel/ethics | Published aggregates may remain if lawfully issued |

For each cell, document: what stops, what may be deleted, what must be retained, how subject is informed, who decides (steward + legal/ethics designee).

---

## 10. Storage security (minimum future controls — not implemented)

| Control | Requirement |
|---------|-------------|
| Encryption in transit | TLS (or equivalent) for all Zone transfers |
| Encryption at rest | Provider-managed or CMK per approved architecture |
| Managed key policy | Documented key ownership / rotation / access |
| Secrets separation | No secrets in git; Secret Manager (or equivalent) |
| Private buckets/databases | No public ACL; private validation boundary |
| Environment isolation | Validation env ≠ consumer production env |
| Least privilege | IAM bindings time-bounded where feasible |
| Backup controls | Encrypted backups; access audited; deletion propagation planned |
| Deletion propagation | Primary + replicas + backups expiration path |

Preserve existing consumer Document OS Model A principles (private storage, no public ACL, platform encryption) as floor — Tier B validation store may be separate but must not be weaker without documented exception.

**Do not implement in this phase.**

---

## 11. Access model (RBAC)

| Role | Typical Zone access | Notes |
|------|---------------------|-------|
| Study coordinator | A (need-to-know); limited C write of logistics flags | No bulk D export |
| Measurement operator | C write for assigned sessions | No Zone A/B |
| Data steward | A/B/C/D administration | Dual control for sensitive ops |
| Analyst | C/D read (released datasets) | **No standing identity access** |
| Scientific reviewer | D/E read | No Zone A/B |
| Security administrator | Platform IAM / audit config | Not scientific data use |
| Auditor / compliance | Audit logs + register | Minimal data access |

Least privilege is mandatory. Analysts must not automatically receive Zone A/B access.

---

## 12. Dual control

Dual approval (two authorized humans, or steward + security/compliance designee) required before:

| Operation |
|-----------|
| Dataset export from Zone D |
| Linkage-table (Zone B) access beyond routine single-subject enrollment |
| Bulk download |
| External sharing |
| Dataset destruction override (retain beyond / destroy earlier than policy) |

Time-bounded grants; all dual-control decisions audited.

---

## 13. Audit logging

Future audit events must cover at least:

view · export · download · linkage access · privilege change · consent change · withdrawal · deletion · dataset release · analysis release

| Logging rule | Requirement |
|--------------|-------------|
| Log actor, action, object id, timestamp, purpose | Yes |
| Avoid logging sensitive measurement contents | Yes — log identifiers/hashes, not FM/waist values by default |
| Tamper-evident / append-oriented storage | Preferred |
| Retention of audit records | Separate retention decision (§17) |

---

## 14. Retention decision framework

Define retention **separately** for:

| Object | Framework inputs (do not invent final duration here) |
|--------|------------------------------------------------------|
| Identity (A) | Legal hold, logistics need, counsel |
| Linkage (B) | Withdrawal model + re-id risk |
| Raw measurements (C) | Scientific need + consent + law |
| Analysis dataset (D) | Approved analyses + reproducibility |
| Derived results | Lineage / recompute needs |
| Aggregate outputs (E) | Publication / claim record |
| Audit records | Accountability minimum vs minimization |

**Do NOT invent final durations without legal/scientific need.** Each Zone gets an explicit retention trigger (time / study-end / consent withdrawal / legal hold) at protocol freeze.

---

## 15. Deletion

Plan procedures for:

| Path | Requirement |
|------|-------------|
| Subject-request deletion | Map to withdrawal matrix; certify completion |
| Study-end deletion | Register-driven destruction |
| Dataset-version retirement | Supersede + destroy or archive per policy |
| Backup expiration | Timed purge after primary destruction |
| Linkage destruction | Zone B purge with dual control |
| Destruction certification | Signed/attested record in governance register |

---

## 16. Re-identification risk

### 16.1 Conceptual risks

Age · sex · body size · dates · site · machine · rare phenotype · repeated trajectories · extreme composition values · small sites · longitudinal linkage.

### 16.2 Mitigations (planning)

| Control | Requirement |
|---------|-------------|
| Date minimization | Study-day / coarsened dates |
| Rare-category handling | Suppress or broaden |
| Small-cell suppression | §17 |
| Controlled exports | Dual control + approved environments |
| No free-text | Structured codes |
| Identity separation | Zones A/B vs C/D/E |
| DXA PDF/images out of analysis store | Default |

Completes ER-BC-15 scientific checklist as governance sign-off input. Residual risk acceptance owner must be named before execution.

---

## 17. Small-cell policy

A numeric threshold **MUST** be frozen before reporting subgroup aggregates.

| Rule | Status |
|------|--------|
| Threshold exists before subgroup reporting | **REQUIRED** |
| Final N | **NOT INVENTED HERE** — set by privacy/legal review + scientific practicality at freeze |
| Sparse cells | Flag **insufficient sample**; do not publish false precision |
| Intersectional cells | Same floor unless stricter |

---

## 18. Data sharing categories

| Category | Requires |
|----------|----------|
| No sharing | Default |
| Internal controlled analysis | Steward release + approved users |
| Approved collaborator | DUA + register + dual control |
| Publication aggregate | Small-cell + publication consent/basis |
| External de-identified dataset | Counsel + re-id review + explicit authorization |

Each share event requires explicit authorization recorded in the governance register.

---

## 19. External partners

Before any clinic / DXA center / university / contractor participates, require review of:

DUA · BAA where applicable · services agreement · confidentiality · security requirements · permitted use · deletion · incident notification · subprocessors

**No partner outreach in this planning phase.** Missing required agreement ⇒ hard NO-GO (§28).

---

## 20. Incident response

### 20.1 Ownership (roles to be named at freeze)

Suspected unauthorized access · lost device · accidental export · misdirected file · credential compromise · re-identification event

### 20.2 Required process stages

1. **Containment** — revoke access, isolate exports
2. **Escalation** — security + steward + counsel path
3. **Preservation** — preserve logs/evidence
4. **Legal/compliance determination** — COUNSEL DETERMINATION REQUIRED for notification duties
5. **Notification assessment** — document go/no-go and recipients if required

Tabletop exercise required before execution (§31).

---

## 21. Data correction

| Correction type | Rule |
|-----------------|------|
| Factual measurement correction | Append correction event; keep prior value + reason |
| Provenance correction | Append; never silent overwrite |
| Identity correction | Zone A only; audited |
| Derived-value regeneration | Recompute under new dataset/analysis version |
| Analysis-version impact | Bump analysis/dataset version; lineage records prior |

**Never silently overwrite research provenance.**

---

## 22. Data lineage

Every future analysis output must trace to:

| Lineage element |
|-----------------|
| Dataset version |
| Protocol version |
| Consent version |
| Measurement source |
| Score-engine version / implementation SHA |
| Resolver version |
| Derived-data version |
| Analysis-plan version |
| Analysis-code SHA |

---

## 23. Dataset release process

Before an analysis dataset (Zone D) may be released:

1. Governance register row complete
2. Consent / legal basis validated
3. Ethics determination recorded
4. Fields minimized
5. Re-identification review complete
6. Users approved (time-bounded)
7. Retention assigned
8. Analysis purpose approved

Missing any item ⇒ **do not release**.

---

## 24. Governance register (required fields)

Freeze required fields (extends Tier B plan §15):

`datasetId` · `purpose` · `controller` · `steward` · `processor` · `subprocessors` · `legalBasis` · `consentVersion` · `ethicsDeterminationType` · `ethicsDeterminationReference` · `source` · `storage` · `encryption` · `roles` / `users` · `audit` · `retention` · `deletion` · `destructionCertification` · `withdrawalRule` · `secondaryUseRule` · `sharingRestrictions` · `exportRestrictions` · `reidentificationRiskStatus` · `smallCellPolicy` · `lineageVersion` · `protocolVersion` · `analysisVersion` · `approvedAnalyses` · `status`

No register **rows** are created in this planning phase (no data).

---

## 25. Governance hard NO-GOs

Future Tier B execution remains **BLOCKED** if **ANY** required item is:

| NO-GO condition |
|-----------------|
| Unresolved legal basis |
| Missing consent (taxonomy incomplete or not obtained when required) |
| Missing ethics determination |
| Unapproved storage |
| Unapproved access / RBAC |
| Missing auditability |
| Missing retention policy |
| Missing withdrawal handling |
| Unresolved re-identification risk |
| Missing partner agreement (when partner in path) |
| Unauthorized export path |

Systemic privacy/governance failure ⇒ **both scores** remain public **NO-GO** (Tier B plan §13.6).

---

## 26. Counsel decision register (questions)

| ID | Question | Facts needed | Jurisdiction | Decision owner | Blocking | Documentation required |
|----|----------|--------------|--------------|----------------|----------|------------------------|
| LC-01 | Is Tier B HSR / product research / QI / exempt / non-exempt for the contemplated design? | Protocol synopsis, interaction/intervention, identifiers | Primary ops + participant residences | Qualified counsel + ethics authority as applicable | **YES** | Written determination |
| LC-02 | What is the lawful basis for each processing purpose? | Purpose list A–K, data types | Same | Counsel | **YES** | `legalBasis` freeze |
| LC-03 | HIPAA CE/BA/hybrid applicability for each data flow | Parties, PHI touchpoints, contracts | US HIPAA | Counsel | **YES** if US clinical sites/PHI | Role memo |
| LC-04 | Which state consumer-health-data laws apply? | Residences, ops nexus, sharing | Candidate US states | Counsel | **YES** if US consumer/participants | Jurisdiction matrix |
| LC-05 | Are BAAs required with sites/vendors? | Services + PHI | US HIPAA | Counsel | Conditional | BAA decision |
| LC-06 | Consent taxonomy: which classes must be separate opt-ins? | Taxonomy A–K, UX | Applicable | Counsel + ethics | **YES** | Consent package |
| LC-07 | Withdrawal/revocation retention outcomes by timing cell | Matrix §9 | Applicable | Counsel + ethics | **YES** | Withdrawal rule version |
| LC-08 | Secondary use / publication / external dataset sharing limits | Sharing categories | Applicable | Counsel | **YES** before share | Sharing restrictions |
| LC-09 | Cross-border transfer constraints if any | Subprocessors, storage regions | Intl as applicable | Counsel | Conditional | Transfer addendum |
| LC-10 | Incident notification duties | Incident classes | Applicable | Counsel | **YES** before execution | IR notification playbook |
| LC-11 | Compensation / inducement legality if contemplated | Amounts, populations | Applicable | Counsel | Conditional | Compensation memo |
| LC-12 | Whether consumer production data/UID may ever be linked | Proposed linkage | Applicable | Counsel | **YES** if proposed | Explicit forbid or controlled basis |

---

## 27. Ethics decision register (questions)

| ID | Question | Facts needed | Decision owner | Blocking | Documentation required |
|----|----------|--------------|----------------|----------|------------------------|
| EC-01 | HSR classification (ethics side) | Protocol synopsis | Ethics authority / IRB as applicable | **YES** | `ethicsDeterminationType` |
| EC-02 | IRB required vs exempt vs no formal IRB | Classification + site rules | Ethics authority | **YES** | `irbRequired`, exemption or `n/a` |
| EC-03 | Participant burden acceptable? | Visit count, time, travel | Ethics | **YES** for human modules | Burden assessment |
| EC-04 | Repeated DXA exposure appropriateness | Scan count, population, site rules | Ethics + site radiation/safety policy | **YES** for DXA modules | DXA exposure justification |
| EC-05 | Vulnerable populations? | Inclusion plan | Ethics | Conditional | Inclusion/exclusion ethics note |
| EC-06 | Compensation if contemplated | Amounts, coercion risk | Ethics | Conditional | Compensation ethics note |
| EC-07 | Withdrawal without penalty clarity | Consent language | Ethics | **YES** | Consent + withdrawal SOP |
| EC-08 | Comprehension materials risk (TB-17) | Stimuli without consumer UI claims | Ethics / scientific | Conditional | Materials review |

---

## 28. Security review gate

Before execution require:

| Gate | Status target |
|------|---------------|
| Architecture review | PASS recorded |
| Threat model | PASS recorded |
| Least-privilege review | PASS recorded |
| Logging review | PASS recorded |
| Export controls | PASS recorded |
| Deletion test | PASS recorded |
| Incident-response tabletop | PASS recorded |
| Access-review procedure | PASS recorded |

---

## 29. No PHI in git (permanent)

**Permanent rule — never waive in ordinary workflow:**

- no participant data
- no real DXA PDFs
- no consent forms containing subject data
- no identifiers
- no exported datasets

committed to git.

Synthetic Wave 1 artifacts remain synthetic-only.

---

## 30. Protocol-freeze inputs (governance items)

At future Tier B Protocol Truth Freeze, each item below must be recorded as **RESOLVED**, **NOT_APPLICABLE**, or **BLOCKED**. Ambiguous TBD is forbidden for these items at execution authorization.

| ID | Item |
|----|------|
| GF-01 | Ethics determination (§4 / EC-*) |
| GF-02 | Legal basis (LC-02) |
| GF-03 | HIPAA/role determination (LC-03) or N/A |
| GF-04 | State consumer-health matrix (LC-04) |
| GF-05 | Consent taxonomy freeze + artifacts |
| GF-06 | Consent versioning schema acceptance |
| GF-07 | Withdrawal/revocation matrix outcomes |
| GF-08 | Data-use purpose limitation |
| GF-09 | Minimum necessary field list |
| GF-10 | Zone architecture + `studySubjectId` model |
| GF-11 | Approved storage boundary |
| GF-12 | Encryption class (transit/rest/keys) |
| GF-13 | RBAC role bindings |
| GF-14 | Dual-control policy |
| GF-15 | Audit logging policy |
| GF-16 | Retention policy per zone |
| GF-17 | Deletion + destruction certification SOP |
| GF-18 | Re-identification risk sign-off (ER-BC-15) |
| GF-19 | Small-cell threshold policy version |
| GF-20 | Sharing / export restrictions |
| GF-21 | Partner agreements (or N/A if none) |
| GF-22 | Incident-response ownership + tabletop |
| GF-23 | Dataset release checklist ownership |
| GF-24 | Governance register template populated for planned datasets (no live rows required pre-collection, but template + owners frozen) |
| GF-25 | Security review gate (§28) |
| GF-26 | Lineage version contract |
| GF-27 | Secondary-use default forbid + exception path |
| GF-28 | No-PHI-in-git attestation |

---

## 31. Relationship to existing Oli privacy architecture

| Existing authority | Relationship to Tier B |
|--------------------|------------------------|
| ADR/RFC consumer consent | Event/versioning patterns reusable; Tier B consents are separate domain |
| Account export/delete ADRs | Consumer product lifecycle; Tier B validation deletion is parallel SOP, not a silent reuse of production UID delete |
| Body Scans Document OS Model A | Consumer scan storage boundaries preserved; Tier B human validation store is separate planning boundary |
| API request-log privacy controls | Measurement contents must not be casually logged |
| RG-LEGAL-01 | Consumer hosted Privacy/Terms gate remains OPEN/independent; does not authorize Tier B |

---

## 32. Explicit non-authorizations

This protocol **does not**:

- authorize Tier B execution
- complete governance closure
- substitute for counsel, IRB, or compliance determinations
- recruit, collect, or store human data
- implement security controls or databases
- authorize consumer scores or claim-level advancement
- freeze final retention durations or small-cell N without review

---

## 33. End-state of this planning document

| Item | Status |
|------|--------|
| Governance / privacy / ethics protocol | **CURRENT (PLANNING)** |
| Governance closure | **NOT COMPLETE** |
| Counsel determinations | **PENDING** |
| Ethics determinations | **PENDING** |
| Security controls implementation | **NOT STARTED** |
| Protocol freeze | **DRAFTING ONLY / WAITING ON DEPENDENCIES** |
| Tier B methodology | **PASS** |
| Evidence review | **Separate authorized workstream** |
| Tier B execution | **NOT AUTHORIZED** |
| Human data | **NONE** |
| Runtime | **UNCHANGED** |

---

END OF TIER B GOVERNANCE / PRIVACY / ETHICS PROTOCOL V1
