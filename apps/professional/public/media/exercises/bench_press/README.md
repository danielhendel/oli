# Bench Press — Local Media Assets

Sprint M7 supports **optional local video files** for Bench Press lesson playback in the Professional app dev environment.

## Location

Place video files in this folder:

```
apps/professional/public/media/exercises/bench_press/
```

They are served by Next.js at:

```
/media/exercises/bench_press/<filename>
```

## Expected filenames

| Scene | Filename |
| --- | --- |
| Coach Intro | `coach-intro.mp4` |
| Hero Demo | `hero-demo.mp4` |
| Setup | `setup.mp4` |
| Execution | `execution.mp4` |
| Common Mistake | `common-mistake.mp4` |
| Slow Motion | `slow-motion.mp4` |
| Muscle Overlay | `muscle-overlay.mp4` |
| Reflection | `reflection.mp4` |

Optional companions (not required for M7):

- `<scene>-poster.jpg` — video poster image
- `<scene>.vtt` — captions (e.g. `hero-demo.vtt`)

## Default behavior (no files)

Sprint M7 works **without any video files**. The lesson player shows storyboard placeholder surfaces and labels scenes as **Asset pending production**.

No errors occur when files are missing.

## Testing real playback locally

1. Add any small `.mp4` file, for example:
   ```
   apps/professional/public/media/exercises/bench_press/hero-demo.mp4
   ```
2. In `apps/professional/src/features/exercise-media-os/data/benchPressMediaAssets.ts`, set the matching asset `status` to `"approved"` for that slot (e.g. `heroDemo`).
3. Restart the dev server:
   ```bash
   npm --workspace @oli/professional run dev
   ```
4. Open Workout Studio → Bench Press → Media → **Preview Bench Press Lesson** → navigate to Hero Demo.
5. Confirm the HTML `<video>` player renders with controls.

Revert the manifest status to `"missing"` when done, or keep test files **untracked** in git.

## Git policy

Video files are **not committed** unless intentionally added to the repo. This README documents the contract only.

## Manifest source of truth

Asset records live in code:

`apps/professional/src/features/exercise-media-os/data/benchPressMediaAssets.ts`

Only assets with `status: "approved"` and a valid `localPath` or `remoteUrl` attach to lesson playback scenes.
