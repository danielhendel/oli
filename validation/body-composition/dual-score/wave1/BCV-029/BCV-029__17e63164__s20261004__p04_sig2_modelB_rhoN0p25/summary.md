# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 290000 | true | 1.0496 | 2.9109 | 0.4990 | 2.2573 |
| perf | 70.0000 | 300000 | true | 0.5858 | 2.3267 | 0.4998 | 1.0670 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8782, H2=0.1219, H3=-0.0000
- perf: P1=-0.0131, P3=1.0131

No product bands, no clinical claims. Synthetic fallback parameters only.
