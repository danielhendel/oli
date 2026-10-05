# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3947 | 1.1482 | 0.4998 | 0.3434 |
| perf | 51.0000 | 120000 | true | 0.0445 | 1.0194 | 0.0510 | 0.2470 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8384, H2=0.1609, H3=0.0007
- perf: P1=0.5909, P3=0.4091

No product bands, no clinical claims. Synthetic fallback parameters only.
