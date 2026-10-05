# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3464 | 1.0098 | 0.5007 | 0.2653 |
| perf | 45.1316 | 120000 | true | 0.5808 | 1.6940 | 0.4971 | 0.7397 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6864, H2=0.0222, H3=0.2914
- perf: P1=0.9616, P3=0.0384

No product bands, no clinical claims. Synthetic fallback parameters only.
