# Manage Tab — Full Health Record (System-Level) Audit + Plan

**Purpose:** Redefine Manage as the **whole human health system** record: system-level, biologically organized, showing both tracked and missing parts.  
**Grounded in:** Human System Model and Core Health Dataset (Health OS white paper).  
**Repo note:** The phrases “Human System Model” and “Core Health Dataset” do not appear in the current repo. This plan defines a **full biological health record structure** that belongs in Manage; when the white paper is added to the repo, this structure should be aligned to it.  
**Scope:** Manage tab only; no code. All “what exists today” claims are verified against code.

---

## 1. Executive Summary

**What this means for Manage**  
Manage is the **world’s greatest personal health record** inside Oli: a **system-level, biologically organized** view of the whole human. It is not a flat mix of app buckets or feature lists. It must:

- Represent the **full** set of health domains that belong in a complete personal health record (aligned to Human System Model / Core Health Dataset when the white paper is in repo).
- Be **grouped** into three clear layers: **Health Systems**, **Clinical Records**, and **Record Integrity** — so the record feels like a structured, professional PHR, not a flat menu.
- Show **both** what is tracked and what is **missing** from the record.
- Use a clear **record state** per category: **Implemented** | **Partial** | **Missing** (defined below).
- Use **record-truth language** for missing or empty states (e.g. “No data in record”, “Not yet recorded”, “Not yet available in Oli”) — not “Coming later” or roadmap language.
- Stay grounded in repo truth for *what we can show today* (routes, hooks, data), while **displaying the full structure** and explicitly labeling what is not yet in the app.

**What we must not do**  
- **Do not** reduce Manage to only the modules currently implemented in code.  
- **Do not** reduce Manage to a logging utility or quick-actions bar.  
- **Do not** reduce Manage to basic fitness metrics only.  
- **Do not** hide missing parts of the record; show them with explicit record-truth labels so the record feels complete and honest.  
- **Do not** reference or depend on Command Center in this plan; Manage stands alone as the health record.

**Best direction**  
- Define **one canonical list of health record categories**, organized into **Health Systems**, **Clinical Records**, and **Record Integrity**. That structure is the **source of truth for what appears on Manage**.  
- For each category, assign a **record state** from repo truth: **Implemented**, **Partial**, or **Missing**.  
- Manage UI shows **all** categories in grouped sections. Implemented and Partial rows show summary data and drill-in where routes exist; **Missing** rows show record-truth language (“Not yet available in Oli” or “No data in record”) and no drill-in.  
- When the Health OS white paper is added to the repo, the category list and groupings should be updated to match that authority.

---

## 2. Full Health Record Structure (Biological / System-Level)

This section defines **what belongs in the record by design** — the full set of categories for a whole-human personal health record. It is **not** limited to what the app implements today. Categories are organized into **three groups** so Manage feels like the world’s greatest PHR: **Health Systems**, **Clinical Records**, and **Record Integrity**.

**Authority:** Today this structure is defined from first principles (standard medical/biological organization). When the Health OS white paper’s **Human System Model** and **Core Health Dataset** are in the repo, they become the source of truth and this list should be aligned or replaced by them.

### 2.1 Group 1 — Health Systems

Body systems and physiological domains. Order is biologically coherent.

| # | Category (record) | Description (whole human) | Notes |
|---|-------------------|---------------------------|--------|
| 1 | **Body & structural** | Weight, body fat, lean mass, DEXA, anthropometrics, structural metrics | Broader structural/body record; repo supports weight, composition, DEXA today |
| 2 | **Cardiovascular** | Heart rate, HRV, blood pressure, cardio activity, steps | Heart and circulation |
| 3 | **Respiratory** | Lung function, respiratory metrics, sleep-related breathing | Lungs and breathing |
| 4 | **Digestive** | Digestion, gut health, related markers | Digestive system; explicit category even if Missing |
| 5 | **Endocrine & hormonal** | Hormones, thyroid, metabolic hormones, related labs | Endocrine system; explicit category even if Missing |
| 6 | **Musculoskeletal** | Strength, movement, exercise, injury/rehab | Muscles, bones, joints |
| 7 | **Sleep & circadian** | Sleep duration, quality, timing, consistency | Sleep and daily rhythm |
| 8 | **Nutrition & metabolism** | Intake, macros, micros, metabolic markers | Diet and metabolism |
| 9 | **Recovery & autonomic** | Readiness, HRV, stress load, recovery metrics | Nervous system / recovery |
| 10 | **Labs & biomarkers** | Bloodwork, biomarkers, lab results | Objective lab data |
| 11 | **Immune & inflammation** | Immune markers, inflammation, illness | Immune system |
| 12 | **Mental & cognitive** | Mood, cognitive load, mental health markers | Brain / mental |

### 2.2 Group 2 — Clinical Records

Clinical and care-oriented data (when we have data).

| # | Category (record) | Description (whole human) | Notes |
|---|-------------------|---------------------------|--------|
| 13 | **Medications & supplements** | Medications, supplements, adherence | Pharmacological |
| 14 | **Conditions & diagnoses** | Diagnoses, conditions, care plan | Clinical record |
| 15 | **Imaging & documents** | Scans, PDFs, uploads, external documents | Documents and imaging |

### 2.3 Group 3 — Record Integrity

Integrity and quality of the record itself.

| # | Category (record) | Description (whole human) | Notes |
|---|-------------------|---------------------------|--------|
| 16 | **Data quality** | Ingestion failures, unresolved events, data issues | Record integrity |

**Total: 16 categories** across three groups. Manage shows all 16 with a clear record state for each.

### 2.4 Mapping full record → current app (repo truth)

- **Body & structural** → body/weight, body/index, body/overview, body/dexa; dailyFacts.body; useWeightSeries. Repo supports weight, body fat, DEXA; “Body & structural” allows broader structural record as repo evolves.  
- **Cardiovascular** → dailyFacts.activity (steps, cardio), dailyFacts.recovery (HRV); recovery/readiness; workouts. No single “cardiovascular” route. **Partial.**  
- **Respiratory** → No route, no hook. **Missing.**  
- **Digestive** → No route, no hook. **Missing.**  
- **Endocrine & hormonal** → No dedicated route/hook (labs could include hormone panels later). **Missing.**  
- **Musculoskeletal** → workouts; dailyFacts.strength. **Implemented.**  
- **Sleep & circadian** → recovery/sleep; dailyFacts.sleep. **Implemented.**  
- **Nutrition & metabolism** → nutrition; dailyFacts.nutrition. **Implemented.**  
- **Recovery & autonomic** → recovery/readiness; dailyFacts.recovery. **Implemented.**  
- **Labs & biomarkers** → labs; useLabResults. **Implemented.**  
- **Immune & inflammation** → No dedicated route/hook. **Missing.**  
- **Mental & cognitive** → No route, no hook. **Missing.**  
- **Medications & supplements** → No route, no hook. **Missing.**  
- **Conditions & diagnoses** → No route, no hook. **Missing.**  
- **Imaging & documents** → useUploadsPresence (count + latest); no list screen. **Partial.**  
- **Data quality** → failures; useFailuresRange. **Implemented.**

---

## 3. Record State: Implemented / Partial / Missing

Every category in the full health record gets exactly one **record state** for the Manage UI. Definitions:

- **Implemented** — The category has at least one dedicated route (or a route that clearly serves it), and at least one hook/API that can return data for it. We can show “latest” or “count” or “presence” and the user can drill in. When there is no data yet, use **“No data in record”** or **“Not yet recorded”** (record-truth language).  
- **Partial** — Some data or one route exists, but the category is not fully represented. We show what we have and drill where we can; when no data, use “No data in record” or “Not yet recorded.”  
- **Missing** — The category is part of the full record but the app has **no** route and **no** data for it. We show the category name and **record-truth language only** — e.g. **“Not yet available in Oli”** or **“No data in record”**. Do **not** use “Coming later” or roadmap language by default.

**Per-category state (verified from repo):**

| Category (full record) | Record state | Reason (repo truth) |
|-------------------------|-------------|----------------------|
| Body & structural | **Implemented** | body/weight, body/*; useDailyFacts.body, useWeightSeries |
| Cardiovascular | **Partial** | Steps, cardio in activity; HRV in recovery; no single “cardiovascular” route |
| Respiratory | **Missing** | No route, no hook, no contract |
| Digestive | **Missing** | No route, no hook |
| Endocrine & hormonal | **Missing** | No dedicated route/hook |
| Musculoskeletal | **Implemented** | workouts; dailyFacts.strength |
| Sleep & circadian | **Implemented** | recovery/sleep; dailyFacts.sleep |
| Nutrition & metabolism | **Implemented** | nutrition; dailyFacts.nutrition |
| Recovery & autonomic | **Implemented** | recovery/readiness; dailyFacts.recovery |
| Labs & biomarkers | **Implemented** | labs; useLabResults |
| Immune & inflammation | **Missing** | No dedicated route/hook |
| Mental & cognitive | **Missing** | No route, no hook |
| Medications & supplements | **Missing** | No route, no hook |
| Conditions & diagnoses | **Missing** | No route, no hook |
| Imaging & documents | **Partial** | useUploadsPresence (count + latest); no list screen |
| Data quality | **Implemented** | failures; useFailuresRange |

**Implemented** = 7. **Partial** = 2. **Missing** = 7 (respiratory, digestive, endocrine & hormonal, immune, mental, medications, conditions).

---

## 4. Recommended Information Architecture

Manage is structured as **three groups**, not a flat list. This makes the record feel like the world’s greatest PHR: system-level and professionally organized.

### 4.1 Group 1 — Health Systems (section label)

- **Purpose:** Body systems and physiological domains.  
- **Order:** Body & structural → Cardiovascular → Respiratory → Digestive → Endocrine & hormonal → Musculoskeletal → Sleep & circadian → Nutrition & metabolism → Recovery & autonomic → Labs & biomarkers → Immune & inflammation → Mental & cognitive.  
- **What each row contains:**  
  - **Implemented:** Category title | summary (e.g. “72.5 kg”, “8 results”, “7h sleep”) or **“No data in record”** / **“Not yet recorded”** when empty | chevron; tap → existing route.  
  - **Partial:** Category title | summary when data exists, or “No data in record” / “Not yet recorded” | chevron where route exists; tap → route.  
  - **Missing:** Category title | **“Not yet available in Oli”** (or “No data in record”); no chevron; no drill-in. Do **not** use “Coming later.”

### 4.2 Group 2 — Clinical Records (section label)

- **Purpose:** Clinical and care-oriented data.  
- **Order:** Medications & supplements → Conditions & diagnoses → Imaging & documents.  
- **What each row contains:** Same pattern as Health Systems: Implemented/Partial show summary or “No data in record” / “Not yet recorded”; Missing show “Not yet available in Oli”; no roadmap language.

### 4.3 Group 3 — Record Integrity (section label)

- **Purpose:** Integrity and quality of the record.  
- **Order:** Data quality (single category).  
- **What each row contains:** Implemented; show failure count or “None”; tap → failures route.

### 4.4 What is currently supported by repo (data + routes)

- **Verified in code (no Command Center in this plan):**  
  - Routes: body/weight, body/index, body/overview, body/dexa; workouts; nutrition; recovery, recovery/sleep, recovery/readiness; labs (index, overview, log, upload, biomarkers, lab-result/[id]); failures; log; event/[id].  
  - Hooks: useDailyFacts(day), useLabResults, useUploadsPresence, useFailuresRange, useFailures, useEvents, useRawEvents, useWeightSeries (and others as needed; no new hooks).  
  - Contracts: dailyFacts (sleep, activity, recovery, body, nutrition, strength), labResults, uploads (count + latest), failure list, canonical/raw event kinds.

- **Mapping to full record (16 categories):**  
  - Body & structural, Musculoskeletal, Sleep, Nutrition, Recovery, Labs, Data quality → **Implemented**.  
  - Cardiovascular, Imaging & documents → **Partial**.  
  - Respiratory, Digestive, Endocrine & hormonal, Immune, Mental, Medications, Conditions → **Missing**.

---

## 5. Canonical Role of Manage (Revised)

**Exact purpose**  
Manage is the user’s **whole-human personal health record**: a single, system-level, biologically organized view of **all** major health domains. It shows what is tracked, what is partial, and what is **explicitly missing** from the record so the user always sees the full picture.

**What it should show on first load**  
- Title (e.g. “Manage” or “Health record”) and subtitle (e.g. “Your health record — tracked and missing.”).  
- Settings (existing pattern).  
- **Three grouped sections:** Health Systems → Clinical Records → Record Integrity. **16 categories** total. For each row:
  - **Implemented:** Category name + summary (latest or count) or **“No data in record”** / **“Not yet recorded”** when empty + chevron; tap → existing route.  
  - **Partial:** Category name + summary or “No data in record” / “Not yet recorded” + chevron if route exists; tap → existing route.  
  - **Missing:** Category name + **“Not yet available in Oli”** (or “No data in record”); no drill-in. No “Coming later” language.

**What it should NOT show**  
- Only the subset of categories that have app support.  
- Quick-log or logging as the primary focus.  
- Hiding missing domains; missing must be visible and labeled.  
- Command Center or any dependency on it in this plan.

**Relationship to other tabs**  
- **Dash:** Home / launcher.  
- **Timeline:** When things happened.  
- **Library:** Browse and search events/raw data.  
- **Stats:** Interpretive metrics and trends.  
- **Manage:** **The record itself** — full human system, grouped, implemented + partial + missing.

---

## 6. Data Availability Matrix (Full Record)

For each of the **16** categories. Use **record-truth language** only; no “Coming later.”

| Category | Group | Record state | Route? | Hook/API? | Latest/count? | Show on Manage? | Label when no / missing data |
|----------|--------|--------------|--------|-----------|----------------|------------------|------------------------------|
| Body & structural | Health Systems | Implemented | Yes (body/*) | useDailyFacts.body, useWeightSeries | Yes | Yes | “No data in record” / “Not yet recorded” |
| Cardiovascular | Health Systems | Partial | Partial (recovery, workouts) | dailyFacts.activity, recovery | Yes (steps, HRV) | Yes | “No data in record” |
| Respiratory | Health Systems | Missing | No | No | No | Yes | **“Not yet available in Oli”** |
| Digestive | Health Systems | Missing | No | No | No | Yes | **“Not yet available in Oli”** |
| Endocrine & hormonal | Health Systems | Missing | No | No | No | Yes | **“Not yet available in Oli”** |
| Musculoskeletal | Health Systems | Implemented | Yes (workouts) | dailyFacts.strength | Yes | Yes | “No data in record” |
| Sleep & circadian | Health Systems | Implemented | Yes (recovery/sleep) | dailyFacts.sleep | Yes | Yes | “No data in record” |
| Nutrition & metabolism | Health Systems | Implemented | Yes (nutrition) | dailyFacts.nutrition | Yes | Yes | “No data in record” |
| Recovery & autonomic | Health Systems | Implemented | Yes (recovery/readiness) | dailyFacts.recovery | Yes | Yes | “No data in record” |
| Labs & biomarkers | Health Systems | Implemented | Yes (labs) | useLabResults | Yes | Yes | “No results” / “Not yet recorded” |
| Immune & inflammation | Health Systems | Missing | No | No | No | Yes | **“Not yet available in Oli”** |
| Mental & cognitive | Health Systems | Missing | No | No | No | Yes | **“Not yet available in Oli”** |
| Medications & supplements | Clinical Records | Missing | No | No | No | Yes | **“Not yet available in Oli”** |
| Conditions & diagnoses | Clinical Records | Missing | No | No | No | Yes | **“Not yet available in Oli”** |
| Imaging & documents | Clinical Records | Partial | No list screen | useUploadsPresence | Count + latest | Yes | “No uploads” / “Not yet recorded” |
| Data quality | Record Integrity | Implemented | Yes (failures) | useFailuresRange | Count | Yes | “None” |

**All 16** appear on Manage in three groups. Seven Implemented, two Partial, seven Missing. No roadmap or “Coming later” language.

---

## 7. UX Plan for Manage (Full Record)

**Structure (top to bottom)**  
1. Safe area + container.  
2. Header: “Manage” (or “Health record”), subtitle “Your health record — tracked and missing.” (or “System-level view of your health.”), Settings.  
3. **Group 1 — Health Systems** (section label, uppercase, gray).  
   - List of 12 categories in order: Body & structural → Cardiovascular → Respiratory → Digestive → Endocrine & hormonal → Musculoskeletal → Sleep & circadian → Nutrition & metabolism → Recovery & autonomic → Labs & biomarkers → Immune & inflammation → Mental & cognitive.  
4. **Group 2 — Clinical Records** (section label, uppercase, gray).  
   - List of 3 categories: Medications & supplements → Conditions & diagnoses → Imaging & documents.  
5. **Group 3 — Record Integrity** (section label, uppercase, gray).  
   - Single category: Data quality.  
6. Each row:
   - **Implemented:** Title | summary (e.g. “72.5 kg”, “8 results”) or **“No data in record”** / **“Not yet recorded”** | chevron; tap → route.  
   - **Partial:** Title | summary or “No data in record” / “Not yet recorded” | chevron if route exists; tap → route.  
   - **Missing:** Title | **“Not yet available in Oli”** (or “No data in record”); no chevron; tap = no-op. Do **not** use “Coming later.”  
7. No footer roadmap line; keep copy record-truth only.

**Row style**  
- Reuse Library-style row (title left, status right).  
- For **Missing**, use same row style but muted (e.g. gray subtitle “Not yet available in Oli”) and no navigation.  
- For Implemented/Partial, use existing colors and chevron.

**Empty / loading / error**  
- Loading: one screen-level “Loading health record…” then render all 16 rows in three groups (Implemented/Partial get data; Missing always show “Not yet available in Oli”).  
- Error: ErrorState with retry for primary data; Missing rows unaffected; Implemented/Partial rows that depend on failed hooks show “—” or “Error” for that row.

**Apple-clean**  
- One scrollable screen; three clear groups; full record visible; no tabs.  
- Record-truth language only; no “Coming later” or roadmap.  
- Grouped so the record feels like a structured PHR, not a flat mix of systems and app buckets.  
- No educational layer in this scope.

---

## 8. File-Level Implementation Plan (Unchanged Scope)

**Modify**  
- **app/(app)/(tabs)/manage.tsx** — Replace current content with:
  - Full list of **16** categories in **three groups** (Health Systems, Clinical Records, Record Integrity) from §2.1–2.3.
  - For each category: id, title, group, **recordState** (Implemented | Partial | Missing), optional route, optional hook/slice.
  - Data: useDailyFacts(today), useLabResults, useUploadsPresence, useFailuresRange (existing hooks only).
  - Render: Implemented and Partial rows show summary or “No data in record” / “Not yet recorded” + drill-in where route exists; **Missing** rows show “Not yet available in Oli” (or “No data in record”) and no navigation. No “Coming later.”
  - No new routes; Missing rows do not link.

**Create**  
- **None** for v1. Optionally **lib/modules/healthRecordCategories.ts** (or similar) with the full list of 14 and record state derived from a constant (so product can later align to white paper by editing one place).

**Leave untouched**  
- Layouts, other tabs, lib/data, lib/api, lib/contracts, lib/ui (use as-is).  
- No new backend or new hooks; only the **list** is expanded to 14 and record state is applied.

**Defer**  
- Human System Model / Core Health Dataset from white paper: when added to repo, replace or align the category list in §2.1.  
- New routes for Missing categories (respiratory, immune, mental, medications, conditions).  
- “Learn more” for Missing (optional copy later).

---

## 9. Blockers and Decisions

**Hard blockers**  
- None. We can show all 14 categories and label Missing explicitly with no new API.

**Soft blockers**  
- Exact copy for Missing: “Not yet in app” vs “Coming later” vs “Part of your record — not yet in Oli.”  
- Order of 14: biological order as in §2.1 is recommended; product may prefer a different order (e.g. most-used first).

**Product decisions**  
- Subtitle: “Your health record — tracked and missing” vs “System-level view of your health” vs other.  
- Whether Missing rows are tappable (e.g. to a future “Coming soon” or info screen) or strictly no-op.  
- When the white paper is added: adopt its Human System Model and Core Health Dataset as the single source of truth for category list and grouping.

---

## 10. Recommended Build Order for Manage

**Scope (unchanged):** Manage only; one-screen first slice; existing hooks and routes only; no new backend; no educational layer yet.

**First slice**  
- **app/(app)/(tabs)/manage.tsx** only.  
- Define the **full 16-category list** in **three groups** (Health Systems, Clinical Records, Record Integrity) with record state (Implemented / Partial / Missing) as a constant.  
- Use existing hooks for the 7 Implemented + 2 Partial categories; for the 7 Missing, render row with **“Not yet available in Oli”** (or “No data in record”) and no link. No “Coming later.”  
- Same loading/error behavior (e.g. FailClosed or LoadingState for primary data).  
- Ship so Manage shows the **whole** record, grouped, with record-truth labels only.

**Second slice (optional)**  
- Add **lib/modules/healthRecordCategories.ts** (or similar) with the full list, groups, and record state so the white paper can be aligned in one place.

**Polish**  
- When Human System Model / Core Health Dataset are in repo: align category titles, order, and groupings to that document.  
- Accessibility and copy pass.

---

## 11. Summary: Three-Way Distinction

| Layer | Meaning | Where it lives |
|-------|--------|----------------|
| **1. Full health record structure** | What *belongs* in the record (whole human), in three groups | §2 — 16 categories in Health Systems, Clinical Records, Record Integrity; later aligned to white paper |
| **2. What repo supports today** | Routes, hooks, API, contracts | §4.4; verified in code; Command Center out of scope |
| **3. Record state on Manage** | Implemented / Partial / Missing; record-truth labels only | §3, §6 — drives what each row shows and whether it links |

Manage shows **all 16** in **three groups**, labeled by (3), using only (2) for data and navigation. Record-truth language only (“No data in record”, “Not yet recorded”, “Not yet available in Oli”); no “Coming later.” It is the world’s greatest personal health record: system-level, biologically organized, grouped, and honest about what is tracked and what is missing.

---

*End of full health record audit and plan. Repo truth used for “what exists”; full record structure is design authority for “what Manage shows.”*
