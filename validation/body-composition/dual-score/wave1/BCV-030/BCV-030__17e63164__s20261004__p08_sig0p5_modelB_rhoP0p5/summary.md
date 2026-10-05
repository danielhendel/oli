# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2837 | 0.8244 | 0.4970 | 0.1776 |
| perf | 22.8750 | 120000 | true | 0.2351 | 2.0516 | 0.2359 | 0.4935 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6226, H2=0.0343, H3=0.3431
- perf: P1=1.1101, P3=-0.1101

No product bands, no clinical claims. Synthetic fallback parameters only.
