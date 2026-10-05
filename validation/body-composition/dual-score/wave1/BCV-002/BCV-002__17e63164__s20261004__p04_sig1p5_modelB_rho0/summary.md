# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 180000 | true | 0.8112 | 2.2080 | 0.4993 | 1.3205 |
| perf | 70.0000 | 210000 | true | 0.4363 | 1.7551 | 0.4998 | 0.6000 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8815, H2=0.1185, H3=0.0000
- perf: P1=-0.0126, P3=1.0126

No product bands, no clinical claims. Synthetic fallback parameters only.
