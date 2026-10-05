# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.8710 | 2.5537 | 0.5006 | 1.6847 |
| perf | 52.6377 | 120000 | true | 1.5555 | 4.5314 | 0.4992 | 5.3163 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6073, H2=-0.0502, H3=0.4428
- perf: P1=1.2197, P3=-0.2197

No product bands, no clinical claims. Synthetic fallback parameters only.
