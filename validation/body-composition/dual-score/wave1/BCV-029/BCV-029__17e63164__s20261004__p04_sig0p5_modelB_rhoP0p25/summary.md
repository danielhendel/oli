# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.2795 | 0.8045 | 0.4994 | 0.1688 |
| perf | 70.0000 | 260000 | true | 0.1466 | 0.6015 | 0.4999 | 0.0694 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8926, H2=0.1074, H3=0.0000
- perf: P1=0.0000, P3=1.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
