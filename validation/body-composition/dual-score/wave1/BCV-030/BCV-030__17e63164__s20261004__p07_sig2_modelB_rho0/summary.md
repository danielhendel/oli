# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9755 | 2.8413 | 0.4989 | 2.1010 |
| perf | 52.6377 | 120000 | true | 1.7338 | 5.0624 | 0.5015 | 6.6701 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4918, H2=0.0561, H3=0.4520
- perf: P1=1.0770, P3=-0.0770

No product bands, no clinical claims. Synthetic fallback parameters only.
