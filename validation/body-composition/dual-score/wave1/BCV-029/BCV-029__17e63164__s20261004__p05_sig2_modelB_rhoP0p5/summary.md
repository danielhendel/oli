# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8072 | 2.3615 | 0.4998 | 1.4392 |
| perf | 51.0000 | 120000 | true | 0.4478 | 4.7821 | 0.1885 | 4.0826 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7898, H2=0.1653, H3=0.0449
- perf: P1=0.8521, P3=0.1479

No product bands, no clinical claims. Synthetic fallback parameters only.
