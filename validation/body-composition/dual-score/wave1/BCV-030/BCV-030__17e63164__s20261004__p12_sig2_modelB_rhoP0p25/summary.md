# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 200000 | true | 1.4088 | 4.0440 | 0.4990 | 4.2866 |
| perf | 45.1316 | 160000 | true | 2.1327 | 7.5827 | 0.4980 | 13.6217 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6465, H2=0.0382, H3=0.3153
- perf: P1=1.1086, P3=-0.1086

No product bands, no clinical claims. Synthetic fallback parameters only.
