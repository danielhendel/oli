# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4405 | 1.2792 | 0.5005 | 0.4275 |
| perf | 52.6377 | 120000 | true | 0.7804 | 2.2696 | 0.4992 | 1.3401 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6032, H2=-0.0513, H3=0.4481
- perf: P1=1.2191, P3=-0.2191

No product bands, no clinical claims. Synthetic fallback parameters only.
