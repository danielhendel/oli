# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5952 | 1.7525 | 0.5010 | 0.7961 |
| perf | 51.0000 | 120000 | true | 0.2583 | 2.5072 | 0.1407 | 1.4706 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8145, H2=0.1654, H3=0.0201
- perf: P1=0.7906, P3=0.2094

No product bands, no clinical claims. Synthetic fallback parameters only.
