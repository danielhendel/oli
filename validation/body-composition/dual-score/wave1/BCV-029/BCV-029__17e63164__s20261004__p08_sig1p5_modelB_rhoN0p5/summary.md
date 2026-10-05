# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8209 | 2.3758 | 0.4977 | 1.4674 |
| perf | 22.8750 | 120000 | true | 0.7150 | 6.5800 | 0.3653 | 5.4773 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6981, H2=0.0566, H3=0.2453
- perf: P1=0.9904, P3=0.0096

No product bands, no clinical claims. Synthetic fallback parameters only.
