# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5938 | 1.7367 | 0.5010 | 0.7819 |
| perf | 51.0000 | 120000 | true | 0.2037 | 2.4157 | 0.1282 | 1.4314 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8277, H2=0.1599, H3=0.0124
- perf: P1=0.8075, P3=0.1925

No product bands, no clinical claims. Synthetic fallback parameters only.
