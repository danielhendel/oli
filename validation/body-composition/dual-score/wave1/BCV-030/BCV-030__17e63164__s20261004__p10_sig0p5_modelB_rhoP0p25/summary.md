# BCV-030 — Aggregate uncertainty propagation

- persona: P-10 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 76.0742 | 120000 | true | 0.3022 | 0.8779 | 0.4979 | 0.2003 |
| perf | 80.1304 | 290000 | true | 0.4701 | 1.3635 | 0.5001 | 0.4860 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6897, H2=0.0000, H3=0.3103
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
