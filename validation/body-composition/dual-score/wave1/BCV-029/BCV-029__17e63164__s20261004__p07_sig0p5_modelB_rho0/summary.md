# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2455 | 0.7104 | 0.5021 | 0.1317 |
| perf | 52.6377 | 120000 | true | 0.4357 | 1.2657 | 0.5026 | 0.4163 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4876, H2=0.0547, H3=0.4576
- perf: P1=1.0763, P3=-0.0763

No product bands, no clinical claims. Synthetic fallback parameters only.
