# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1977 | 0.5750 | 0.4997 | 0.0861 |
| perf | 51.0000 | 120000 | true | 0.0010 | 0.4378 | 0.0006 | 0.0241 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8386, H2=0.1614, H3=0.0000
- perf: P1=0.0113, P3=0.9887

No product bands, no clinical claims. Synthetic fallback parameters only.
