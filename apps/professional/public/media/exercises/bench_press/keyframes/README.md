# Bench Press Keyframe Images

Local-only keyframe image paths for Bench Press image pack production.

**Operator guide (Google Flow export):**  
`docs/authoritative/Oli Bench Press Google Flow Export Checklist v1.md`

## Expected 16:9 master paths

| Pose | Public path |
|------|-------------|
| setup | `/media/exercises/bench_press/keyframes/setup-16x9.png` |
| start_lockout | `/media/exercises/bench_press/keyframes/start-lockout-16x9.png` |
| bottom_chest_pause | `/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png` |
| finish_lockout | `/media/exercises/bench_press/keyframes/finish-lockout-16x9.png` |

## Future render targets (optional)

- 9:16 mobile portrait: `setup-9x16.png`, `start-lockout-9x16.png`, etc.
- 1:1 thumbnail: `setup-1x1.png`, `start-lockout-1x1.png`, etc.

## Production rules

- Do not mark candidates `approved-master` unless files exist in this folder **and** pass M10 QA, rights, and hard gates.
- Dev-test images do not count toward approved master image pack approval.
- Video hero demo assets do not satisfy image pack requirements.
