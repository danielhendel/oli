# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.0405 | 3.0413 | 0.4949 | 2.3695 |
| perf | 22.8750 | 150000 | true | 0.9380 | 8.0494 | 0.1792 | 7.4028 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7820, H2=0.0286, H3=0.1894
- perf: P1=1.1497, P3=-0.1497

No product bands, no clinical claims. Synthetic fallback parameters only.
