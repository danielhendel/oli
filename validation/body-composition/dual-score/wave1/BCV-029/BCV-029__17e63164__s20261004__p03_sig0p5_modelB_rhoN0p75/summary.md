# BCV-029 — Joint correlated measurement error propagation

- persona: P-03 (male), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 120000 | true | 0.2437 | 0.7082 | 0.5004 | 0.1302 |
| perf | 55.2857 | 120000 | true | 0.8596 | 2.4986 | 0.5025 | 1.6198 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4427, H2=0.0000, H3=0.5573
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
