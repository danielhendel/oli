# BCV-029 — Joint correlated measurement error propagation

- persona: P-06 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.3814 | 120000 | true | 0.6165 | 1.7776 | 0.5011 | 0.8251 |
| perf | 85.5652 | 120000 | true | 0.9679 | 2.8243 | 0.5007 | 2.0778 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6838, H2=0.0000, H3=0.3162
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
