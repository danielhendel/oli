# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1832 | 3.4281 | 0.4968 | 3.0594 |
| perf | 89.5833 | 230000 | true | 0.8832 | 2.5496 | 0.4998 | 1.6959 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7960, H2=0.2040, H3=0.0000
- perf: P1=-0.0042, P3=1.0042

No product bands, no clinical claims. Synthetic fallback parameters only.
