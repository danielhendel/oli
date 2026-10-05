# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.2787 | 0.8015 | 0.5007 | 0.1677 |
| perf | 70.0000 | 190000 | true | 0.1459 | 0.6041 | 0.4999 | 0.0694 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8938, H2=0.1062, H3=0.0000
- perf: P1=-0.0000, P3=1.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
