# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7324 | 2.1284 | 0.4991 | 1.1779 |
| perf | 52.6377 | 120000 | true | 1.3049 | 3.7964 | 0.5014 | 3.7521 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4878, H2=0.0563, H3=0.4559
- perf: P1=1.0775, P3=-0.0775

No product bands, no clinical claims. Synthetic fallback parameters only.
