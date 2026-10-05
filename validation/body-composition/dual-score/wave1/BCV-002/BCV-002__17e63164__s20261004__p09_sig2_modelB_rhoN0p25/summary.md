# BCV-002 — Measurement perturbation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1743 | 3.4278 | 0.5007 | 3.0536 |
| perf | 89.5833 | 220000 | true | 0.8759 | 2.5577 | 0.4990 | 1.6928 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7938, H2=0.2062, H3=0.0000
- perf: P1=-0.0020, P3=1.0020

No product bands, no clinical claims. Synthetic fallback parameters only.
