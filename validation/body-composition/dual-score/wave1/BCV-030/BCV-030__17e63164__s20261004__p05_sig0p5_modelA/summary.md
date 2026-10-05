# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1982 | 0.5740 | 0.4990 | 0.0859 |
| perf | 51.0000 | 120000 | true | 0.0008 | 0.4346 | 0.0008 | 0.0241 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8384, H2=0.1616, H3=0.0000
- perf: P1=0.0090, P3=0.9910

No product bands, no clinical claims. Synthetic fallback parameters only.
