# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5538 | 1.6120 | 0.5017 | 0.6715 |
| perf | 22.8750 | 120000 | true | 0.4716 | 4.0998 | 0.2378 | 1.9710 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6626, H2=0.0446, H3=0.2927
- perf: P1=1.1093, P3=-0.1093

No product bands, no clinical claims. Synthetic fallback parameters only.
