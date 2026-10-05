# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8032 | 2.3415 | 0.4999 | 1.4207 |
| perf | 51.0000 | 160000 | true | 0.4084 | 4.6449 | 0.1803 | 4.0075 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8020, H2=0.1612, H3=0.0368
- perf: P1=0.8627, P3=0.1373

No product bands, no clinical claims. Synthetic fallback parameters only.
