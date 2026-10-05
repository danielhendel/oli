# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9648 | 2.8051 | 0.5010 | 2.0534 |
| perf | 52.6377 | 240000 | true | 1.6842 | 4.8973 | 0.5010 | 6.2162 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5011, H2=0.0466, H3=0.4523
- perf: P1=1.1187, P3=-0.1187

No product bands, no clinical claims. Synthetic fallback parameters only.
