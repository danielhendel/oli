# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5520 | 1.5012 | 0.5007 | 0.6183 |
| perf | 70.0000 | 240000 | true | 0.2933 | 1.1888 | 0.4993 | 0.2751 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8859, H2=0.1141, H3=0.0000
- perf: P1=-0.0003, P3=1.0003

No product bands, no clinical claims. Synthetic fallback parameters only.
