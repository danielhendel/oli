# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5730 | 1.6509 | 0.5012 | 0.7131 |
| perf | 22.8750 | 120000 | true | 0.4784 | 4.1627 | 0.2814 | 2.0997 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6278, H2=0.0684, H3=0.3038
- perf: P1=1.0753, P3=-0.0753

No product bands, no clinical claims. Synthetic fallback parameters only.
