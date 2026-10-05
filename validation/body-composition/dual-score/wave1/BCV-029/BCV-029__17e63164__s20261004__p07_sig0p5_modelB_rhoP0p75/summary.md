# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2198 | 0.6397 | 0.5006 | 0.1064 |
| perf | 52.6377 | 120000 | true | 0.3905 | 1.1315 | 0.4992 | 0.3350 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6028, H2=-0.0507, H3=0.4478
- perf: P1=1.2200, P3=-0.2200

No product bands, no clinical claims. Synthetic fallback parameters only.
