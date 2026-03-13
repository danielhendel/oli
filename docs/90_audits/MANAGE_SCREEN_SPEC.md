# Manage Screen Spec

**Scope:** Manage tab only. One-screen first slice. Existing hooks and routes only. No new backend. No educational layer. No Command Center.  
**Source:** Final Manage full health record plan (16 categories, 3 groups, record-truth language only).  
**Target file:** `app/(app)/(tabs)/manage.tsx`.

---

## 1. Final section structure

Three section headers, with categories in this exact order:

**1) HEALTH SYSTEMS** (uppercase, gray section label)  
1. Body & structural  
2. Cardiovascular  
3. Respiratory  
4. Digestive  
5. Endocrine & hormonal  
6. Musculoskeletal  
7. Sleep & circadian  
8. Nutrition & metabolism  
9. Recovery & autonomic  
10. Labs & biomarkers  
11. Immune & inflammation  
12. Mental & cognitive  

**2) CLINICAL RECORDS** (uppercase, gray section label)  
13. Medications & supplements  
14. Conditions & diagnoses  
15. Imaging & documents  

**3) RECORD INTEGRITY** (uppercase, gray section label)  
16. Data quality  

---

## 2. Per-category behavior

For each of the 16 categories:

| # | Title | Group | Record state | Subtitle logic (when data exists) | Fallback subtitle (no data / error / missing) | Route (if tappable) | Tappable? |
|---|--------|--------|--------------|------------------------------------|-----------------------------------------------|----------------------|-----------|
| 1 | Body & structural | Health Systems | Implemented | Latest weight: e.g. "72.5 kg" (from body.weightKg); if also bodyFatPercent optional "72.5 kg, 18% fat" or just weight | "No data in record" | `/(app)/body` | Yes |
| 2 | Cardiovascular | Health Systems | Partial | Steps and/or HRV: e.g. "4,200 steps" or "HRV 42 ms" or "4,200 steps · HRV 42 ms" (from activity.steps, recovery.hrvRmssd) | "No data in record" | `/(app)/recovery/readiness` | Yes |
| 3 | Respiratory | Health Systems | Missing | — | "Not yet available in Oli" | — | No |
| 4 | Digestive | Health Systems | Missing | — | "Not yet available in Oli" | — | No |
| 5 | Endocrine & hormonal | Health Systems | Missing | — | "Not yet available in Oli" | — | No |
| 6 | Musculoskeletal | Health Systems | Implemented | e.g. "3 workouts" or "12 sets" (from strength.workoutsCount / totalSets) | "No data in record" | `/(app)/workouts` | Yes |
| 7 | Sleep & circadian | Health Systems | Implemented | e.g. "7h 12m" (from sleep.totalMinutes) | "No data in record" | `/(app)/recovery/sleep` | Yes |
| 8 | Nutrition & metabolism | Health Systems | Implemented | e.g. "1,840 kcal" or "92 g protein" (from nutrition.totalKcal / proteinG) | "No data in record" | `/(app)/nutrition` | Yes |
| 9 | Recovery & autonomic | Health Systems | Implemented | e.g. "HRV 42 ms" (from recovery.hrvRmssd) | "No data in record" | `/(app)/recovery/readiness` | Yes |
| 10 | Labs & biomarkers | Health Systems | Implemented | e.g. "8 results" (count from useLabResults data.items.length) | "Not yet recorded" or "No results" | `/(app)/labs` | Yes |
| 11 | Immune & inflammation | Health Systems | Missing | — | "Not yet available in Oli" | — | No |
| 12 | Mental & cognitive | Health Systems | Missing | — | "Not yet available in Oli" | — | No |
| 13 | Medications & supplements | Clinical Records | Missing | — | "Not yet available in Oli" | — | No |
| 14 | Conditions & diagnoses | Clinical Records | Missing | — | "Not yet available in Oli" | — | No |
| 15 | Imaging & documents | Clinical Records | Partial | e.g. "3 uploads" or "Latest: [date]" (from useUploadsPresence: count, optional latest) | "No uploads" or "Not yet recorded" | `/(app)/labs/upload` | Yes |
| 16 | Data quality | Record Integrity | Implemented | e.g. "2 issues" or "None" (from useFailuresRange data.items.length) | "None" | `/(app)/failures` | Yes |

**Subtitle rules (record-truth only):**  
- Implemented/Partial with data: show the summary (weight, steps, count, etc.) as above.  
- Implemented/Partial with no data: show the fallback in the table (e.g. "No data in record", "Not yet recorded", "No results", "None").  
- Missing: always show "Not yet available in Oli".  
- Do not use "Coming later" or any roadmap language.  
- If the hook for a row is in error state, that row’s subtitle may show "—" or "Error" (see §4).

---

## 3. Data sources

Exactly which existing hook(s) and field(s) to use:

| Category | Hook(s) | Field(s) / usage |
|----------|---------|-------------------|
| Body & structural | `useDailyFacts(day)` | `data.body.weightKg`, `data.body.bodyFatPercent` when `status === "ready"`. Optional: `useWeightSeries("30D")` for latest from series (see §7). |
| Cardiovascular | `useDailyFacts(day)` | `data.activity.steps`, `data.recovery.hrvRmssd` when `status === "ready"`. |
| Respiratory | — | None. |
| Digestive | — | None. |
| Endocrine & hormonal | — | None. |
| Musculoskeletal | `useDailyFacts(day)` | `data.strength.workoutsCount`, `data.strength.totalSets` when `status === "ready"`. |
| Sleep & circadian | `useDailyFacts(day)` | `data.sleep.totalMinutes` when `status === "ready"`. |
| Nutrition & metabolism | `useDailyFacts(day)` | `data.nutrition.totalKcal`, `data.nutrition.proteinG` when `status === "ready"`. |
| Recovery & autonomic | `useDailyFacts(day)` | `data.recovery.hrvRmssd` when `status === "ready"`. |
| Labs & biomarkers | `useLabResults({ limit: 50 })` | `data.items.length` when `status === "ready"`. |
| Immune & inflammation | — | None. |
| Mental & cognitive | — | None. |
| Medications & supplements | — | None. |
| Conditions & diagnoses | — | None. |
| Imaging & documents | `useUploadsPresence()` | `data.count`, `data.latest` when `status === "ready"`. |
| Data quality | `useFailuresRange({ start, end, limit })` | `data.items.length` when `status === "ready"`. Range: e.g. last 90 days (same as Library). |

**Single day for daily facts:** Use today. Derive `day` with `getTodayDayKey()` from `@/lib/time/dayKey`.  
**Failures range:** Use same range as Library: end = today, start = 90 days ago (YYYY-MM-DD).  
**No other hooks.** Do not add or depend on Command Center or any new API.

---

## 4. Loading / error behavior

- **Screen-level loading**  
  - While any of the primary data hooks (`useDailyFacts`, `useLabResults`, `useUploadsPresence`, `useFailuresRange`) is in `status === "partial"` and no hook has yet failed with a terminal error, show a single screen-level loading state (e.g. "Loading health record…" or use existing `LoadingState` from `@/lib/ui/ScreenStates`).  
  - Then render the full 16-row, 3-group list. Missing categories always show "Not yet available in Oli"; Implemented/Partial rows show data when ready or fallback subtitle.

- **Row-level fallback**  
  - For each Implemented/Partial row: if the corresponding hook is not `status === "ready"`, show the **fallback subtitle** for that row (e.g. "No data in record", "Not yet recorded", "None") rather than a loading spinner on the row.  
  - Exception: if screen-level loading is shown, rows can be hidden or show fallback until loading is done; prefer one screen-level loading then one paint of the full list.

- **Error behavior**  
  - If a **primary** data source fails (e.g. `useDailyFacts` or `useLabResults` returns `status === "error"`), decide one of:  
    - **Option A (fail-closed):** Show screen-level `ErrorState` with message and retry; on retry call that hook’s `refetch()`.  
    - **Option B (resilient):** Do not block the whole screen; show the full list and for rows that depend on the failed hook show subtitle "—" or "Error"; keep Missing and other Implemented/Partial rows that use other hooks unchanged.  
  - Spec recommends **Option B** for first slice: partial failures do not hide the record; only the affected row(s) show "—" or "Error" and remain tappable if they have a route.

- **Partial failures**  
  - If only some hooks error (e.g. dailyFacts ready, labResults error): render all 16 rows; rows that use the failed hook show "—" or "Error" as subtitle; others show data or fallback as in §2. No Command Center; no extra error UI for Missing rows.

---

## 5. UI structure (top-to-bottom layout of manage.tsx)

1. **Safe area + container**  
   - Use `ScreenContainer` from `@/lib/ui/ScreenStates` (same as current Manage and Library).

2. **Header row**  
   - Title: `"Manage"` (or `"Health record"` — one chosen string).  
   - Subtitle: `"Your health record — tracked and missing."` (or `"System-level view of your health."` — one chosen string).  
   - Right slot: `SettingsGearButton` (existing component).  
   - Use `PageTitleRow` from `@/lib/ui/PageTitleRow` to match other tabs.

3. **ScrollView**  
   - Single scrollable content (no inner tabs).  
   - Content container: padding (e.g. 16), paddingBottom (e.g. 40).

4. **Section 1 — HEALTH SYSTEMS**  
   - Section label: uppercase, gray (e.g. fontSize 13, fontWeight 600, color #8E8E93), same style as Library section labels.  
   - Then one row per category in order 1–12 (Body & structural through Mental & cognitive).  
   - Row style: title left, subtitle right (or below title), chevron only when tappable. Reuse Library-style row or `ModuleSectionLinkRow`-like row (title + subtitle; for Missing, muted subtitle, no chevron, no onPress).

5. **Section 2 — CLINICAL RECORDS**  
   - Section label: same style as above.  
   - Then one row per category in order 13–15 (Medications & supplements, Conditions & diagnoses, Imaging & documents).

6. **Section 3 — RECORD INTEGRITY**  
   - Section label: same style as above.  
   - Then one row: Data quality (16).

7. **No footer**  
   - No “Coming later” or roadmap line. No educational layer in this scope.

**Row behavior:**  
- **Implemented / Partial (tappable):** Same row style as existing module rows; subtitle = summary or fallback; show chevron; `onPress` → `router.push(route)`.  
- **Missing:** Same row style; subtitle = "Not yet available in Oli" (muted gray); no chevron; no `onPress` (or no-op).

---

## 6. File-level coding plan

- **Implement only in:** `app/(app)/(tabs)/manage.tsx`.

- **In manage.tsx:**  
  - Define a **local constant** (or inline structure) for the **16 categories** with: id, title, group (Health Systems | Clinical Records | Record Integrity), recordState (Implemented | Partial | Missing), optional route (string for `router.push`).  
  - Call existing hooks once: `useDailyFacts(getTodayDayKey())`, `useLabResults({ limit: 50 })`, `useUploadsPresence()`, `useFailuresRange({ start, end, limit })` with start/end for last 90 days.  
  - Derive subtitle per row from hook data + record state as in §2 and §3.  
  - Render: ScreenContainer → PageTitleRow → ScrollView → three sections with section labels and rows.  
  - Use record-truth copy only; no “Coming later”.  
  - Do not add new routes or new hooks.

- **Helper constant:**  
  - Keep the 16-category list **local** to `manage.tsx` for the first slice.  
  - Optional later: extract to e.g. `lib/modules/healthRecordCategories.ts` with the same structure (id, title, group, recordState, route) so the white paper can align in one place. Not required for this spec.

- **Do not create:**  
  - New screens, new routes, new API modules, or new data hooks.  
  - Command Center references or navigation.  
  - Educational or “Learn more” layer.

---

## 7. Implementation notes

- **Body & structural:** Summary is driven by `useDailyFacts(day).data.body` (weightKg, optionally bodyFatPercent). If product prefers “latest weight” from a time series, `useWeightSeries("30D").latest` could be used instead or in addition; current repo supports both. First slice can use dailyFacts only for simplicity; then subtitle is “No data in record” when body is absent or missing.

- **Cardiovascular:** No single “cardiovascular” route. Summary is approximate: steps and/or HRV from dailyFacts (activity, recovery). Drill-in is to `/(app)/recovery/readiness` as the primary cardiovascular-related screen. Do not invent a new route.

- **Imaging & documents:** No dedicated uploads list screen. Subtitle shows upload count (and optionally “Latest: …”) from `useUploadsPresence`. Tappable to `/(app)/labs/upload` as the “add document” entry point. Summary is limited to count (and optionally latest) by current repo support.

- **Labs & biomarkers:** “No results” or “Not yet recorded” is acceptable fallback when `useLabResults` is ready but `items.length === 0`.

- **Data quality:** Fallback when no failures is “None” (not “No data in record”). Count is from `useFailuresRange` (e.g. last 90 days); same range as Library for consistency.

- **Missing categories (3, 4, 5, 11, 12, 13, 14):** No hooks, no routes. Only render title + “Not yet available in Oli” and do not make the row tappable.

---

*End of Manage Screen Spec. Implement exactly this in `app/(app)/(tabs)/manage.tsx` only; no code in this document.*
