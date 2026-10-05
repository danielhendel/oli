# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5981 | 1.7270 | 0.5012 | 0.7794 |
| perf | 51.0000 | 120000 | true | 0.1439 | 2.2436 | 0.1155 | 1.2535 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8247, H2=0.1626, H3=0.0127
- perf: P1=0.8334, P3=0.1666

No product bands, no clinical claims. Synthetic fallback parameters only.
