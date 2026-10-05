# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 210000 | true | 1.4129 | 4.0529 | 0.5019 | 4.3291 |
| perf | 45.1316 | 130000 | true | 2.2319 | 7.8785 | 0.4966 | 14.7323 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6392, H2=0.0438, H3=0.3170
- perf: P1=1.0586, P3=-0.0586

No product bands, no clinical claims. Synthetic fallback parameters only.
