# BCV-002 — Measurement perturbation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1766 | 3.4370 | 0.5007 | 3.0575 |
| perf | 89.5833 | 200000 | true | 0.8839 | 2.5432 | 0.4990 | 1.6901 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7945, H2=0.2055, H3=0.0000
- perf: P1=-0.0065, P3=1.0065

No product bands, no clinical claims. Synthetic fallback parameters only.
