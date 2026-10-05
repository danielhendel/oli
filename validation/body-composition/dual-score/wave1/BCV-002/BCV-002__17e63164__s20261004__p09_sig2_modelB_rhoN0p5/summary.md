# BCV-002 — Measurement perturbation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1709 | 3.4118 | 0.5007 | 3.0296 |
| perf | 89.5833 | 350000 | true | 0.8776 | 2.5608 | 0.5004 | 1.7009 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7948, H2=0.2052, H3=0.0000
- perf: P1=-0.0008, P3=1.0008

No product bands, no clinical claims. Synthetic fallback parameters only.
