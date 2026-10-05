# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 210000 | true | 0.8059 | 2.2162 | 0.4997 | 1.3203 |
| perf | 70.0000 | 200000 | true | 0.4401 | 1.7714 | 0.5000 | 0.6145 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8812, H2=0.1188, H3=-0.0000
- perf: P1=-0.0002, P3=1.0002

No product bands, no clinical claims. Synthetic fallback parameters only.
