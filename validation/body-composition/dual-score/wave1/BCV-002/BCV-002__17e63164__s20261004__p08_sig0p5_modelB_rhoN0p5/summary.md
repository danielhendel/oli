# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2830 | 0.8200 | 0.5001 | 0.1754 |
| perf | 22.8750 | 120000 | true | 0.2441 | 2.1968 | 0.3637 | 0.6097 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6238, H2=0.0354, H3=0.3408
- perf: P1=0.9910, P3=0.0090

No product bands, no clinical claims. Synthetic fallback parameters only.
