# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 130000 | true | 1.0545 | 2.9193 | 0.4992 | 2.2727 |
| perf | 70.0000 | 300000 | true | 0.5941 | 2.3550 | 0.4998 | 1.0948 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8793, H2=0.1208, H3=-0.0001
- perf: P1=0.0011, P3=0.9989

No product bands, no clinical claims. Synthetic fallback parameters only.
