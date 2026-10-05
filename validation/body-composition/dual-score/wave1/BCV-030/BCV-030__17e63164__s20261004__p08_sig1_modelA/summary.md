# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5745 | 1.6684 | 0.4990 | 0.7216 |
| perf | 22.8750 | 120000 | true | 0.4762 | 4.2208 | 0.3113 | 2.1841 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6166, H2=0.0741, H3=0.3093
- perf: P1=1.0440, P3=-0.0440

No product bands, no clinical claims. Synthetic fallback parameters only.
