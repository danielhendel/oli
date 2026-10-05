# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7331 | 2.1419 | 0.4999 | 1.1851 |
| perf | 52.6377 | 130000 | true | 1.3028 | 3.7973 | 0.4971 | 3.7382 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4875, H2=0.0547, H3=0.4578
- perf: P1=1.0780, P3=-0.0780

No product bands, no clinical claims. Synthetic fallback parameters only.
