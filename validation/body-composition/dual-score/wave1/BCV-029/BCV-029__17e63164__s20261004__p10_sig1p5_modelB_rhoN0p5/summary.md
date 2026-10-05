# BCV-029 — Joint correlated measurement error propagation

- persona: P-10 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 76.0742 | 120000 | true | 0.9075 | 2.6409 | 0.5010 | 1.8164 |
| perf | 80.1304 | 140000 | true | 1.4131 | 4.0953 | 0.4990 | 4.3763 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6893, H2=-0.0004, H3=0.3111
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
