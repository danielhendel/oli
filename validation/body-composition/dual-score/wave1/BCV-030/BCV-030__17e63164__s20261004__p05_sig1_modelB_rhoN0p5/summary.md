# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3959 | 1.1488 | 0.4988 | 0.3436 |
| perf | 51.0000 | 120000 | true | 0.0249 | 0.9865 | 0.0457 | 0.2236 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8356, H2=0.1632, H3=0.0012
- perf: P1=0.6140, P3=0.3860

No product bands, no clinical claims. Synthetic fallback parameters only.
