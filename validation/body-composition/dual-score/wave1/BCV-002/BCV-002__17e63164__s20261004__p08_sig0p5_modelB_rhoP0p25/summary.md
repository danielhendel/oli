# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2914 | 0.8486 | 0.5000 | 0.1872 |
| perf | 22.8750 | 120000 | true | 0.2399 | 2.0853 | 0.2770 | 0.5239 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5943, H2=0.0598, H3=0.3459
- perf: P1=1.0750, P3=-0.0750

No product bands, no clinical claims. Synthetic fallback parameters only.
