# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.7119 | 2.0585 | 0.5024 | 1.1060 |
| perf | 45.1316 | 120000 | true | 1.0636 | 3.3436 | 0.4967 | 2.8021 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6539, H2=0.0445, H3=0.3015
- perf: P1=1.0574, P3=-0.0574

No product bands, no clinical claims. Synthetic fallback parameters only.
