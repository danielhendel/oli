# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 130000 | true | 0.8047 | 2.2007 | 0.5004 | 1.3081 |
| perf | 70.0000 | 130000 | true | 0.4343 | 1.7361 | 0.4999 | 0.5888 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8815, H2=0.1185, H3=0.0000
- perf: P1=-0.0220, P3=1.0220

No product bands, no clinical claims. Synthetic fallback parameters only.
