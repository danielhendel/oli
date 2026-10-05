# BCV-001 — Mathematical surface stress (male)

Reference anchors: {"whtr":0.5,"fmi":5.5,"almi":8,"ffmi":19} (validation-only, not normative targets).

## 1D sweeps

| construct | points | min | max | max adjacent jump | max abs slope | non-finite | out-of-range | null |
|---|---|---|---|---|---|---|---|---|
| H1 | 122 | 0 | 100 | 2.500000 | 300.0000 | 0 | 0 | 0 |
| H2 | 129 | 10 | 92 | 3.000000 | 12.0000 | 0 | 0 | 0 |
| H3_ALMI | 99 | 15 | 92 | 4.000000 | 40.0000 | 0 | 0 | 0 |
| H3_FFMI | 119 | 15 | 92 | 5.714286 | 57.1429 | 0 | 0 | 0 |
| P1 | 125 | 10 | 95 | 4.285714 | 42.8571 | 0 | 0 | 0 |
| P3 | 129 | 8 | 92 | 3.916667 | 15.6667 | 0 | 0 | 0 |

## 2D aggregate surfaces (canonicalAxisGrid Cartesian product)

| surface | cells | min | max | floor | ceiling | null | non-finite |
|---|---|---|---|---|---|---|---|
| HEALTH_H1_H2 | 8066 | 21.900000000000002 | 95.6 | 0 | 0 | 0 | 0 |
| HEALTH_H1_H3_ALMI | 6438 | 35.199999999999996 | 95.6 | 0 | 0 | 0 | 0 |
| HEALTH_H1_H3_FFMI | 7918 | 35.199999999999996 | 95.6 | 0 | 0 | 0 | 0 |
| HEALTH_H2_H3_ALMI | 9483 | 42.5 | 86.6 | 0 | 0 | 0 | 0 |
| HEALTH_H2_H3_FFMI | 11663 | 42.5 | 86.6 | 0 | 0 | 0 | 0 |
| PERFORMANCE_P1_P3 | 11881 | 9 | 93.5 | 0 | 0 | 0 | 0 |

Dense-local grids apply to 1D sweeps only. NaN/out-of-range counts must be zero.
