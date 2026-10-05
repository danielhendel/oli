# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7274 | 2.1112 | 0.5014 | 1.1629 |
| perf | 52.6377 | 120000 | true | 1.3541 | 3.9160 | 0.5024 | 4.0193 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4997, H2=0.0461, H3=0.4541
- perf: P1=1.0428, P3=-0.0428

No product bands, no clinical claims. Synthetic fallback parameters only.
