# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8171 | 2.3996 | 0.4964 | 1.4763 |
| perf | 22.8750 | 120000 | true | 0.7062 | 6.1001 | 0.2356 | 4.3978 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6972, H2=0.0577, H3=0.2451
- perf: P1=1.1107, P3=-0.1107

No product bands, no clinical claims. Synthetic fallback parameters only.
