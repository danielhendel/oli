# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 270000 | true | 1.3795 | 3.9674 | 0.4995 | 4.1069 |
| perf | 45.1316 | 120000 | true | 2.0024 | 7.2904 | 0.4977 | 12.4816 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6721, H2=0.0215, H3=0.3065
- perf: P1=1.1681, P3=-0.1681

No product bands, no clinical claims. Synthetic fallback parameters only.
