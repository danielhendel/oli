# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1031 | 3.2301 | 0.4964 | 2.6748 |
| perf | 22.8750 | 120000 | true | 0.9556 | 8.3499 | 0.2817 | 8.3418 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6867, H2=0.0853, H3=0.2280
- perf: P1=1.0763, P3=-0.0763

No product bands, no clinical claims. Synthetic fallback parameters only.
