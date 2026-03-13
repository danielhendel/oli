# Manage Accordion Spec

**Purpose:** Revise Manage from a route launcher to an **expandable personal health record**. Top-level category rows expand/collapse inline; navigation only via optional footer action inside expanded content.  
**Scope:** Manage tab only. Same 16 categories, 3 groups. No backend changes. No new files unless necessary.  
**Target:** `app/(app)/(tabs)/manage.tsx`.

---

## 1. Interaction model

### Collapsed behavior
- Each of the 16 categories is a **single top-level row** (same order and section labels as today).
- Row shows: **category title** (left) and a **summary subtitle** (right) — e.g. "72.5 kg", "No data in record", "Not yet available in Oli" — using the same logic as the current spec (record state + hook data).
- **Tap on the row** toggles **expand/collapse** for that category only. No navigation on tap.
- Chevron (or caret) indicates expand/collapse state (e.g. down when collapsed, up when expanded). All rows are tappable for expand/collapse; Missing categories expand to show their metric list with "Not yet available in Oli" values.
- No top-level navigation: tapping the row never calls `router.push` by default.

### Expanded behavior
- When a category is expanded, **below the title row** (inline, same section) show a **short list of core metrics** for that category.
- Each metric is one row: **metric name** (left) and **value** (right).
- Value rules:
  - If repo has data → show current value (e.g. "72.5 kg", "7h 12m").
  - If supported by repo but empty / no data → **"Not yet recorded"**.
  - If not implemented (Missing category, or metric not in repo) → **"Not yet available in Oli"**.
- Optional: at the bottom of the expanded block, a **single footer action** (e.g. "Open details" or "Go to [category]") only when there is a clear existing route for that category. Tapping the footer action navigates (e.g. `router.push(route)`). If no route (Missing), do not show a footer action.
- Only one category (or none) is expanded at a time: expanding another collapses the previously expanded one (accordion single-open behavior), unless product prefers multi-expand; spec recommends **single-open** for clarity.

### Navigation behavior
- **No navigation** on top-level row tap — only expand/collapse.
- **Navigation only** via the optional footer action inside expanded content, when a route exists for that category.
- Existing routes remain as today (body, recovery/readiness, recovery/sleep, workouts, nutrition, labs, labs/upload, failures). No new routes.

---

## 2. Per-category metric definitions

When a category is expanded, show these **core metrics** (short list). Order is stable and scoped to what the record represents.

| # | Category | Core metrics (expanded list) |
|---|----------|-----------------------------|
| 1 | Body & structural | Weight (kg), Body fat (%) |
| 2 | Cardiovascular | Steps, HRV (ms) |
| 3 | Respiratory | Respiratory rate / Lung function (conceptual; no repo data) — value "Not yet available in Oli" |
| 4 | Digestive | Gut / digestion markers (conceptual) — value "Not yet available in Oli" |
| 5 | Endocrine & hormonal | Hormone panels / Thyroid (conceptual) — value "Not yet available in Oli" |
| 6 | Musculoskeletal | Workouts (count), Sets (today) |
| 7 | Sleep & circadian | Sleep (duration) |
| 8 | Nutrition & metabolism | Calories (kcal), Protein (g) |
| 9 | Recovery & autonomic | HRV (ms) |
| 10 | Labs & biomarkers | Lab results (count) |
| 11 | Immune & inflammation | Immune markers (conceptual) — value "Not yet available in Oli" |
| 12 | Mental & cognitive | Mood / cognitive load (conceptual) — value "Not yet available in Oli" |
| 13 | Medications & supplements | Medications list (conceptual) — value "Not yet available in Oli" |
| 14 | Conditions & diagnoses | Conditions list (conceptual) — value "Not yet available in Oli" |
| 15 | Imaging & documents | Uploads (count) |
| 16 | Data quality | Open issues (count) |

**Note:** For Missing categories (3, 4, 5, 11, 12, 13, 14), the metric list is a fixed set of **one or two conceptual metrics** (e.g. one row "Respiratory metrics" or "Lung function" for Respiratory). Each shows value **"Not yet available in Oli"**. This keeps the record structure visible and honest without inventing data.

---

## 3. Metric value rules

For each metric: repo-truth source (if available), fallback when supported but empty, fallback when not implemented.

### Health Systems

| Category | Metric | Repo source | Fallback (supported, empty) | Fallback (not implemented) |
|----------|--------|-------------|-----------------------------|----------------------------|
| Body & structural | Weight (kg) | `useDailyFacts(day).data.body.weightKg` | "Not yet recorded" | — |
| Body & structural | Body fat (%) | `useDailyFacts(day).data.body.bodyFatPercent` | "Not yet recorded" | — |
| Cardiovascular | Steps | `useDailyFacts(day).data.activity.steps` | "Not yet recorded" | — |
| Cardiovascular | HRV (ms) | `useDailyFacts(day).data.recovery.hrvRmssd` | "Not yet recorded" | — |
| Respiratory | (e.g. "Lung function" or "Respiratory metrics") | — | — | "Not yet available in Oli" |
| Digestive | (e.g. "Digestive markers") | — | — | "Not yet available in Oli" |
| Endocrine & hormonal | (e.g. "Hormone panels") | — | — | "Not yet available in Oli" |
| Musculoskeletal | Workouts (count) | `useDailyFacts(day).data.strength.workoutsCount` | "Not yet recorded" | — |
| Musculoskeletal | Sets (today) | `useDailyFacts(day).data.strength.totalSets` | "Not yet recorded" | — |
| Sleep & circadian | Sleep (duration) | `useDailyFacts(day).data.sleep.totalMinutes` → format e.g. "7h 12m" | "Not yet recorded" | — |
| Nutrition & metabolism | Calories (kcal) | `useDailyFacts(day).data.nutrition.totalKcal` | "Not yet recorded" | — |
| Nutrition & metabolism | Protein (g) | `useDailyFacts(day).data.nutrition.proteinG` | "Not yet recorded" | — |
| Recovery & autonomic | HRV (ms) | `useDailyFacts(day).data.recovery.hrvRmssd` | "Not yet recorded" | — |
| Labs & biomarkers | Lab results (count) | `useLabResults({ limit: 50 }).data.items.length` | "No results" / "Not yet recorded" | — |
| Immune & inflammation | (e.g. "Immune markers") | — | — | "Not yet available in Oli" |
| Mental & cognitive | (e.g. "Mood / cognitive") | — | — | "Not yet available in Oli" |

### Clinical Records

| Category | Metric | Repo source | Fallback (supported, empty) | Fallback (not implemented) |
|----------|--------|-------------|-----------------------------|----------------------------|
| Medications & supplements | (e.g. "Medications list") | — | — | "Not yet available in Oli" |
| Conditions & diagnoses | (e.g. "Conditions list") | — | — | "Not yet available in Oli" |
| Imaging & documents | Uploads (count) | `useUploadsPresence().data.count` | "No uploads" / "Not yet recorded" | — |

### Record Integrity

| Category | Metric | Repo source | Fallback (supported, empty) | Fallback (not implemented) |
|----------|--------|-------------|-----------------------------|----------------------------|
| Data quality | Open issues (count) | `useFailuresRange(...).data.items.length` | "None" | — |

**Hook error:** If the hook for that category is in `status === "error"`, show **"—"** for the metric value(s) that depend on it. Same as current spec.

**Record-truth only:** Use "Not yet recorded", "Not yet available in Oli", "No results", "No uploads", "None" as above. No "Coming later" or roadmap language.

---

## 4. UI structure

### Top-level row (category)
- Same visual as today: title (left), subtitle (right).
- Subtitle = current summary from hook/record state (e.g. "72.5 kg", "No data in record", "Not yet available in Oli").
- **Chevron/caret** on the right: e.g. `chevron-down` when collapsed, `chevron-up` when expanded (or rotate one icon). Communicates that the row is expandable.
- **Tap target:** entire row. **Action:** toggle expanded state for this category (and collapse any other expanded category if single-open).
- No navigation on row tap.

### Expanded metric list
- Renders **directly below** the category row, inside the same section (no extra section header).
- Container: slight left indent or same padding; background can be slightly muted (e.g. light gray) to group with the category.
- Each **metric row:** metric name (left), value (right). Same row style as current Manage rows but visually subordinate (e.g. smaller font or muted).
- No chevron on metric rows; they are read-only.

### Optional footer action
- Only when the category has an **existing route** (Implemented or Partial with route).
- One line at the bottom of the expanded block: e.g. "Open details" or "Go to Body" (category-specific label). Tappable; on press → `router.push(route)`.
- Missing categories: **no footer action** (no route).
- Style: small, link-like (e.g. "Open details" in blue or muted, no chevron).

---

## 5. File-level implementation plan

**Single file:** `app/(app)/(tabs)/manage.tsx`.

**State:**
- **Local state for expanded category:** e.g. `expandedCategoryId: string | null`. When user taps a category row, set to that category’s `id` if currently collapsed (or null if tapping the same row to collapse); if another row was expanded, set to the new row’s `id` (single-open). No global loading gate; keep current no-gate render.

**Data:**
- Keep existing hooks unchanged: `useDailyFacts(getTodayDayKey())`, `useLabResults({ limit: 50 })`, `useUploadsPresence()`, `useFailuresRange(...)` with 90-day range.
- Derive **top-level subtitle** per category as today (from `getSubtitle(cat)`).
- Derive **per-metric value** for expanded content from the same hooks: one small helper or inline logic per category id, returning the list of `{ metricName, value }` for that category. Value = repo value, "Not yet recorded", "Not yet available in Oli", or "—" on error.

**Structure:**
- Keep `HEALTH_RECORD_CATEGORIES` (or equivalent) with id, title, group, recordState, route. Add a **local constant** (or inline) for **per-category metrics**: array of metric definitions (label + how to get value from hooks). For Missing categories, the list is a fixed 1–2 conceptual metrics with value "Not yet available in Oli".
- Render loop: for each category, render (1) the **category row** (title + subtitle + chevron), (2) if `expandedCategoryId === cat.id`, render the **metric list** and then the **footer action** (if route exists).
- Category row `onPress`: toggle `expandedCategoryId` (no `router.push`).

**Components:**
- Keep `RecordRow` (or rename) for the **category** row; add an `onPress` that toggles expand (and optionally receives `isExpanded` for chevron direction).
- Add a small **MetricRow** (or inline) for each metric line (name + value).
- Footer: one `Pressable` with text "Open details" / "Go to [title]" and `router.push(cat.route)` when route exists.

**No new files.** All logic and UI in `manage.tsx`. Optional: remove the `__DEV__` debug logging from the previous fix if desired, or leave until confirmed stable.

---

## 6. Scope guardrails

**Must not change in this iteration:**
- **16 categories and 3 groups** — same order, same titles, same record state (Implemented / Partial / Missing).
- **Data sources** — no new hooks, no new API, no backend. Only `useDailyFacts`, `useLabResults`, `useUploadsPresence`, `useFailuresRange` with same args.
- **Routes** — no new routes. Optional footer action uses existing routes only (body, recovery/readiness, recovery/sleep, workouts, nutrition, labs, labs/upload, failures).
- **Record-truth language** — no "Coming later"; only "Not yet recorded", "Not yet available in Oli", "No data in record", "No results", "No uploads", "None", "—" for error.
- **Header** — same title "Manage", subtitle "Your health record — tracked and missing.", Settings gear. Same `ScreenContainer`, `PageTitleRow`, `ScrollView`, section labels.
- **Other tabs** — no changes to Dash, Timeline, Library, Stats.
- **Command Center** — no references, no dependency.

**Allowed:**
- Changing **only** the interaction in `manage.tsx`: row tap = expand/collapse; optional footer action = navigate. Adding local state for expanded category and rendering the metric list + footer when expanded.

---

*End of Manage Accordion Spec. Implement in `app/(app)/(tabs)/manage.tsx` only; no backend or new files.*
