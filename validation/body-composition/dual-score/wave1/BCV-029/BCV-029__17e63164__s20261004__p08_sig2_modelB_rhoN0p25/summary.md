# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1048 | 3.2236 | 0.4971 | 2.6723 |
| perf | 22.8750 | 120000 | true | 0.9563 | 8.6938 | 0.3416 | 9.3543 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6866, H2=0.0859, H3=0.2275
- perf: P1=1.0167, P3=-0.0167

No product bands, no clinical claims. Synthetic fallback parameters only.
