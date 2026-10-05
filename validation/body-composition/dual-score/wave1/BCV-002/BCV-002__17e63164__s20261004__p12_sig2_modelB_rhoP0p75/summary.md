# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 200000 | true | 1.3444 | 3.8454 | 0.4994 | 3.8874 |
| perf | 45.1316 | 120000 | true | 1.8612 | 6.9695 | 0.4966 | 11.1998 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7152, H2=-0.0104, H3=0.2953
- perf: P1=1.2423, P3=-0.2423

No product bands, no clinical claims. Synthetic fallback parameters only.
