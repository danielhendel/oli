# Phase 3D-C — Lab Graphs Dependency Decision

**Status:** Decided  
**Related:** `PHASE_3D_C_LAB_GRAPHS_AUDIT.md`  
**Branch:** `feat/labs-phase3dc-graphs`  
**Verified base:** `d43ae878373534dbb4cef84c4958221ace826792`

---

## Decision

**Do not add a chart library.**

Use the already-installed Expo-compatible stack:

| Package | Version in repo | Role |
|---------|-----------------|------|
| `react-native-svg` | `15.11.2` | Line, dots, axes |
| `expo` | `~53.0.27` | Host runtime |
| Shared `monotonePathD` | `lib/ui/body/monotoneLinePath.ts` | Monotone cubic path |

No Victory Native, no `@shopify/react-native-skia`, no Gifted Charts, no Reanimated requirement for Labs trend v1.

---

## Evaluation summary

| Option | Verdict |
|--------|---------|
| **react-native-svg (existing)** | **Chosen.** Already used by Body/Weight/Exercise charts; Expo 53 pinned; TypeScript-friendly; small incremental cost; interaction pattern proven in `WeightTrendChart`. |
| Victory Native | Rejected. Not installed; larger surface; unnecessary for a single sparse line series. |
| React Native Skia | Rejected. Not installed; heavier native surface; overkill for ≤50 lab points. |
| Reanimated | Rejected as required dep. Optional peer only today; Reduce Motion can be honored without it. |
| New lightweight chart package | Rejected. Would duplicate repo patterns and add lockfile/Expo resolution risk for one chart. |

---

## License / Expo / lockfile

- **License:** `react-native-svg` remains MIT (existing dependency).
- **Expo resolution:** Already satisfied via current `package.json` pin `15.11.2` and Expo SDK 53.
- **Lockfile:** No dependency change required for chart rendering.
- **Smoke:** Existing SVG chart paths + new Labs series/chart unit tests cover geometry; no separate install smoke needed unless a dep is later added.

---

## Consequences

1. New Labs chart component lives under `lib/ui/labs/` and imports `react-native-svg` + `monotonePathD`.
2. Pure transforms live under `lib/labs/history/` with no UI imports.
3. If Expo later breaks SVG charts app-wide, revisit Skia/Victory as a **product-wide** decision — not Labs-only.

---

## Non-goals

- Adding chart deps “just in case”
- Porting WeightTrendChart wholesale (weight floors / LTTB / graphite light theme differ from Labs dark detail)
- Sparklines on Labs home in this phase
