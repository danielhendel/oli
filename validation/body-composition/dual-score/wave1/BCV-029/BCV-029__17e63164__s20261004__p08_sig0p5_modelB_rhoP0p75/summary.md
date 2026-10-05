# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2726 | 0.7867 | 0.5007 | 0.1619 |
| perf | 22.8750 | 120000 | true | 0.2361 | 1.9890 | 0.1800 | 0.4588 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6903, H2=-0.0134, H3=0.3231
- perf: P1=1.1491, P3=-0.1491

No product bands, no clinical claims. Synthetic fallback parameters only.
