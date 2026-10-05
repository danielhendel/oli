# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5728 | 1.6603 | 0.4995 | 0.7177 |
| perf | 22.8750 | 120000 | true | 0.4753 | 4.1730 | 0.2769 | 2.0878 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6266, H2=0.0687, H3=0.3047
- perf: P1=1.0757, P3=-0.0757

No product bands, no clinical claims. Synthetic fallback parameters only.
