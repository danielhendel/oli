# Sprint 2 — Data Model, Rules, DAL (Completion Notes)

This doc summarizes what was built in Sprint 2 and how to work with it.

---

## ✅ Objectives (completed)
- Typed domain model + utils wired into codebase  
- Firestore **security rules** enforcing user isolation, append-only `events`, read-only `facts/analytics/insights/audit`  
- Emulator-backed tests for rules + DAL  
- Minimal **Data Access Layer (DAL)** that keeps Firebase out of screens  

---

## ⚙️ Why It Matters
- **Security / Privacy:** App Store–grade user isolation and least-privilege access from day one.  
- **Developer Velocity:** A unified DAL prevents scattered Firestore calls, ensures type safety, and simplifies refactors.  
- **Observability:** The `events` stream forms the backbone for the normalization → facts → insights pipeline.

---

## 🧪 How To Run Tests

**Fast tests (no emulator):**
```bash
npm test
