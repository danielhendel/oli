# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8064 | 2.3533 | 0.4999 | 1.4466 |
| perf | 51.0000 | 210000 | true | 0.4512 | 4.7286 | 0.1891 | 4.0726 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7895, H2=0.1671, H3=0.0434
- perf: P1=0.8514, P3=0.1486

No product bands, no clinical claims. Synthetic fallback parameters only.
