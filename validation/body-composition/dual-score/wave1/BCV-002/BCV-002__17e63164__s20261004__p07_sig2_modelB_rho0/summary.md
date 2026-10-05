# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9753 | 2.8445 | 0.4998 | 2.1023 |
| perf | 52.6377 | 120000 | true | 1.7533 | 5.0460 | 0.4979 | 6.6546 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4912, H2=0.0569, H3=0.4519
- perf: P1=1.0784, P3=-0.0784

No product bands, no clinical claims. Synthetic fallback parameters only.
