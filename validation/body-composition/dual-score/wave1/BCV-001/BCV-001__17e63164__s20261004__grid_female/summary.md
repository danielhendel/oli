# BCV-001 — Mathematical surface stress (female)

Reference anchors: {"whtr":0.5,"fmi":8.5,"almi":6.3,"ffmi":16.5} (validation-only, not normative targets).

## 1D sweeps

| construct | points | min | max | max adjacent jump | max abs slope | non-finite | out-of-range | null |
|---|---|---|---|---|---|---|---|---|
| H1 | 122 | 0 | 100 | 2.500000 | 300.0000 | 0 | 0 | 0 |
| H2 | 147 | 10 | 92 | 2.333333 | 9.3333 | 0 | 0 | 0 |
| H3_ALMI | 89 | 15 | 92 | 4.625000 | 46.2500 | 0 | 0 | 0 |
| H3_FFMI | 109 | 15 | 92 | 6.666667 | 66.6667 | 0 | 0 | 0 |
| P1 | 115 | 10 | 95 | 5.000000 | 50.0000 | 0 | 0 | 0 |
| P3 | 147 | 8 | 92 | 2.937500 | 11.7500 | 0 | 0 | 0 |

## 2D aggregate surfaces (canonicalAxisGrid Cartesian product)

| surface | cells | min | max | floor | ceiling | null | non-finite |
|---|---|---|---|---|---|---|---|
| HEALTH_H1_H2 | 9398 | 21.900000000000002 | 95.6 | 0 | 0 | 0 | 0 |
| HEALTH_H1_H3_ALMI | 5698 | 35.199999999999996 | 95.6 | 0 | 0 | 0 | 0 |
| HEALTH_H1_H3_FFMI | 7178 | 35.199999999999996 | 95.6 | 0 | 0 | 0 | 0 |
| HEALTH_H2_H3_ALMI | 9779 | 42.5 | 86.6 | 0 | 0 | 0 | 0 |
| HEALTH_H2_H3_FFMI | 12319 | 42.5 | 86.6 | 0 | 0 | 0 | 0 |
| PERFORMANCE_P1_P3 | 12573 | 9 | 93.5 | 0 | 0 | 0 | 0 |

Dense-local grids apply to 1D sweeps only. NaN/out-of-range counts must be zero.
