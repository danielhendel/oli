# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1113 | 3.2669 | 0.4967 | 2.7163 |
| perf | 22.8750 | 120000 | true | 0.9616 | 8.4828 | 0.3136 | 8.7802 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6778, H2=0.0923, H3=0.2299
- perf: P1=1.0447, P3=-0.0447

No product bands, no clinical claims. Synthetic fallback parameters only.
