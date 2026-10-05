# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5579 | 1.5088 | 0.4994 | 0.6212 |
| perf | 70.0000 | 250000 | true | 0.2941 | 1.2001 | 0.5000 | 0.2769 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8860, H2=0.1140, H3=0.0000
- perf: P1=-0.0003, P3=1.0003

No product bands, no clinical claims. Synthetic fallback parameters only.
