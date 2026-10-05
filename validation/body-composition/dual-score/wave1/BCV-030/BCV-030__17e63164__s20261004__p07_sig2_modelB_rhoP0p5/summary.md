# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9412 | 2.7175 | 0.4979 | 1.9268 |
| perf | 52.6377 | 120000 | true | 1.6246 | 4.7234 | 0.4989 | 5.7746 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5344, H2=0.0146, H3=0.4511
- perf: P1=1.1652, P3=-0.1652

No product bands, no clinical claims. Synthetic fallback parameters only.
