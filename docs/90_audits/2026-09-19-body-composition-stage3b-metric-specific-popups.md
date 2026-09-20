# Stage 3B — Metric-specific Apple Health popups (local persistence governance)

**Date:** 2026-09-19  
**Branch:** `feat/body-composition-stage3b-value-first-shell`

## Narrow Stage 3B local-persistence amendment

Stage 3A prohibited new persistence unless explicitly approved. The Stage 3B
metric-management product requirement is treated as a **narrow local-persistence
amendment**:

| Key | Role |
|-----|------|
| `appleHealth:metricSyncScopes:{uid}` | **Reused** — Oli per-metric sync scope (ON/OFF) |
| `appleHealth:metricLastCheckedAt:{uid}` | **Added** — per-metric last successful latest-sync ISO |

### Explicit truth

- Local account-scoped preference (device-local AsyncStorage)
- Controls **Oli sync scope only** — not native Apple Health permission
- OFF stops future syncing for that metric
- OFF does **not** delete imported Oli data
- OFF does **not** revoke system permission
- Cleared/isolated on account transition via UID keying + transient UI reset
- **No Firestore schema/path was added**
- Backend unchanged

### History honesty

Domain-wide Body history checkpoint (`appleHealth:bodyBackfillState`) remains the
import cursor. Metric popups label History as Off / Importing / Incomplete /
Up to date using domain status **only when that metric’s Oli scope is ON** —
no invented per-metric history precision beyond that.

### Cross-reference

See also Stage 3B interactive toggles / central Apple Health Settings work on this
branch. Popup and Settings share `appleHealth:metricSyncScopes:{uid}` — one source
of truth. No new Firestore path.
