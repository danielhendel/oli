# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1983 | 0.5748 | 0.5013 | 0.0861 |
| perf | 51.0000 | 120000 | true | 0.0018 | 0.4364 | 0.0005 | 0.0241 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8384, H2=0.1616, H3=0.0000
- perf: P1=0.0060, P3=0.9940

No product bands, no clinical claims. Synthetic fallback parameters only.
