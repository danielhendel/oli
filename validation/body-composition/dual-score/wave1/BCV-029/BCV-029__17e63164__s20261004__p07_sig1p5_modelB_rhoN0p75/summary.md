# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.6586 | 1.9158 | 0.4995 | 0.9565 |
| perf | 52.6377 | 120000 | true | 1.4290 | 4.1642 | 0.5023 | 4.4989 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6024, H2=-0.0514, H3=0.4490
- perf: P1=0.9826, P3=0.0174

No product bands, no clinical claims. Synthetic fallback parameters only.
