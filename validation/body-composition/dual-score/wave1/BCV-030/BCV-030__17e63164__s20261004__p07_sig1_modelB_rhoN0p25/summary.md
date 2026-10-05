# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4826 | 1.4032 | 0.5000 | 0.5131 |
| perf | 52.6377 | 120000 | true | 0.8958 | 2.6070 | 0.5005 | 1.7696 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4979, H2=0.0453, H3=0.4569
- perf: P1=1.0432, P3=-0.0432

No product bands, no clinical claims. Synthetic fallback parameters only.
