# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.6016 | 1.7544 | 0.5000 | 0.7981 |
| perf | 51.0000 | 120000 | true | 0.0855 | 2.0510 | 0.1051 | 1.0828 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8132, H2=0.1660, H3=0.0207
- perf: P1=0.8983, P3=0.1017

No product bands, no clinical claims. Synthetic fallback parameters only.
