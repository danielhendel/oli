# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2845 | 0.8273 | 0.5006 | 0.1774 |
| perf | 22.8750 | 120000 | true | 0.2440 | 2.1949 | 0.3653 | 0.6130 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6269, H2=0.0351, H3=0.3380
- perf: P1=0.9903, P3=0.0097

No product bands, no clinical claims. Synthetic fallback parameters only.
