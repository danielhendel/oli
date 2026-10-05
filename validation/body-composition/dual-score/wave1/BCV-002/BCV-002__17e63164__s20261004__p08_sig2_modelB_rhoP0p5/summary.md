# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.0795 | 3.1617 | 0.4941 | 2.5619 |
| perf | 22.8750 | 120000 | true | 0.9354 | 8.1829 | 0.2354 | 7.8434 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7210, H2=0.0661, H3=0.2129
- perf: P1=1.1106, P3=-0.1106

No product bands, no clinical claims. Synthetic fallback parameters only.
