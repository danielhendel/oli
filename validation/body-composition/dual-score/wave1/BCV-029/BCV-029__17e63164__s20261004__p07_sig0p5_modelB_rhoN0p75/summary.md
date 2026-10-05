# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2208 | 0.6406 | 0.4996 | 0.1069 |
| perf | 52.6377 | 120000 | true | 0.4750 | 1.3791 | 0.5020 | 0.4968 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6066, H2=-0.0502, H3=0.4436
- perf: P1=0.9821, P3=0.0179

No product bands, no clinical claims. Synthetic fallback parameters only.
