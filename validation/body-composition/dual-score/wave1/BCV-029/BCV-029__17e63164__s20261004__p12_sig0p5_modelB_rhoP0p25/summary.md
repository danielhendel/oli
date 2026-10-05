# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3553 | 1.0302 | 0.5028 | 0.2767 |
| perf | 45.1316 | 120000 | true | 0.5026 | 1.4700 | 0.4978 | 0.5529 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6614, H2=0.0387, H3=0.2999
- perf: P1=1.1148, P3=-0.1148

No product bands, no clinical claims. Synthetic fallback parameters only.
