# 🤝 CONTRIBUTING TO OLI  
### How to Work in the Oli Repository Without Breaking Trust

**Status:** Binding  
**Authority:** Subordinate to the Oli Constitution and Codebase Rules  
**Applies to:** Humans and AI agents

---

## 1. REQUIRED READING

Before contributing, read:

1. `docs/INDEX.md`
2. `docs/00_truth/CONSTITUTION.md`
3. `docs/00_truth/SOURCE_OF_TRUTH.md`
4. `docs/00_truth/GOVERNANCE_CHARTER.md`
5. `CODEBASE_RULES.md`

---

## 2. CONTRIBUTION PHILOSOPHY

Oli prioritizes:
- correctness
- replayability
- explicit truth
- long-term trust

Speed never overrides these.

---

## 3. AUTHORITY BY LOCATION

| Location | Rule |
|--------|------|
| `docs/00_truth/` | Do not edit casually |
| `docs/70_adrs/` | Append-only |
| `docs/80_rfc/` | Start major changes here |
| `docs/90_audits/` | Immutable |

---

## 4. RFC REQUIREMENTS

RFCs are required for changes affecting:
- truth semantics
- replay behavior
- readiness
- write paths
- Phase 1
- CI invariants

---

## 5. ADR REQUIREMENTS

ADRs are required for:
- architectural decisions
- irreversible tradeoffs

---

## 6. DEFINITION OF DONE

A change is done only when:
- CI is green
- replay preserved
- RFC/ADR completed (if required)
- docs updated

---

## 7. PULL REQUEST CHECKLIST

- Why this change?
- What truth is affected?
- Replay preserved?
- CI green?
- Docs updated?

---

## 8. CI AS JUDICIARY

CI blocks invalid changes.  
There is no override.

---

## 9. AI CONTRIBUTIONS

AI must:
- read governance docs
- plan first
- respect folder authority

AI may not:
- write canonical truth
- bypass governance
- alter history

---

## 10. FINAL RULE

> **Oli must always be more honest than it is helpful.**
