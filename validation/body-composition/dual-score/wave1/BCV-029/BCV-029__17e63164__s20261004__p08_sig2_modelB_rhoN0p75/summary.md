# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.0459 | 3.0421 | 0.4941 | 2.3811 |
| perf | 22.8750 | 120000 | true | 0.9754 | 8.9732 | 0.3871 | 10.2662 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7833, H2=0.0297, H3=0.1870
- perf: P1=0.9694, P3=0.0306

No product bands, no clinical claims. Synthetic fallback parameters only.
